const { Queue, Worker, Job } = require('bullmq');
const Redis = require('redis');
const { db } = require('./db');
const axios = require('axios');

// Initialize Redis connection
const redisConnection = Redis.createClient({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});

// Handle Redis connection errors
redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisConnection.on('connect', () => {
  console.log('Connected to Redis');
});

// Create queues for different types of jobs
const sendQueue = new Queue('send message', { connection: redisConnection });

// Initialize the worker to process jobs
const worker = new Worker('send message', async (job) => {
  const { session_string, chat_id, type, file_path, caption, reply_to_message_id, run_id } = job.data;
  
  // Acquire lock for the session to prevent concurrent usage
  const lockKey = `session_lock:${job.data.session_id}`;
  const lockValue = `worker_${process.pid}_${Date.now()}`;
  const lockTimeout = 300000; // 5 minutes
  
  // Try to acquire the lock
  const lockAcquired = await redisConnection.set(
    lockKey, 
    lockValue, 
    { NX: true, PX: lockTimeout }
  );
  
  if (!lockAcquired) {
    throw new Error(`Session ${job.data.session_id} is locked by another process`);
  }
  
  try {
    // Call the Python service to send the message
    const response = await axios.post(`${process.env.PYTHON_SERVICE_URL}/send_message`, {
      session_string,
      chat_id,
      message_type: type,
      file_path,
      caption,
      reply_to_message_id
    }, {
      headers: {
        'x-internal-secret': process.env.INTERNAL_SECRET
      }
    });
    
    // Update the session's last_used_at
    const updateSessionSql = 'UPDATE sessions SET last_used_at = datetime("now") WHERE session_string = ?';
    await new Promise((resolve, reject) => {
      db.run(updateSessionSql, [session_string], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Update the process run stats
    const updateStatsSql = `
      UPDATE process_runs 
      SET stats = json_set(
        coalesce(stats, '{}'), 
        '$.success_count', 
        coalesce(json_extract(stats, '$.success_count'), 0) + 1
      )
      WHERE id = ?
    `;
    await new Promise((resolve, reject) => {
      db.run(updateStatsSql, [run_id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Log success
    const logSql = 'INSERT INTO logs (run_id, level, message) VALUES (?, ?, ?)';
    await new Promise((resolve, reject) => {
      db.run(logSql, [run_id, 'info', `Message sent successfully to ${chat_id}`], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    return response.data;
  } catch (error) {
    // Update the process run stats for failure
    const updateStatsSql = `
      UPDATE process_runs 
      SET stats = json_set(
        coalesce(stats, '{}'), 
        '$.error_count', 
        coalesce(json_extract(stats, '$.error_count'), 0) + 1
      )
      WHERE id = ?
    `;
    await new Promise((resolve, reject) => {
      db.run(updateStatsSql, [run_id], (err) => {
        if (err) console.error('Error updating stats:', err);
        else resolve();
      });
    });
    
    // Log error
    const logSql = 'INSERT INTO logs (run_id, level, message) VALUES (?, ?, ?)';
    await new Promise((resolve, reject) => {
      db.run(logSql, [run_id, 'error', `Failed to send message to ${chat_id}: ${error.message}`], (err) => {
        if (err) console.error('Error logging error:', err);
        else resolve();
      });
    });
    
    throw error; // This will trigger retries
  } finally {
    // Release the lock
    const currentLockValue = await redisConnection.get(lockKey);
    if (currentLockValue === lockValue) {
      await redisConnection.del(lockKey);
    }
  }
}, { 
  connection: redisConnection,
  concurrency: 5  // Process up to 5 jobs concurrently
});

// Function to add a send message job to the queue
const addSendMessageJob = async (run_id, project_id, target_channel_id, session_id, message_ref, options = {}) => {
  // Get message details
  const messageSql = 'SELECT message_type, content_ref, caption FROM project_messages WHERE id = ?';
  const message = await new Promise((resolve, reject) => {
    db.get(messageSql, [message_ref], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  // Get file details if this is a media message
  let file_path = null;
  if (message.message_type !== 'text') {
    const fileSql = 'SELECT path FROM files WHERE id = ?';
    const file = await new Promise((resolve, reject) => {
      db.get(fileSql, [message.content_ref], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    file_path = file.path;
  }
  
  // Get channel details
  const channelSql = 'SELECT chat_id FROM channels WHERE id = ?';
  const channel = await new Promise((resolve, reject) => {
    db.get(channelSql, [target_channel_id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  // Get session details
  const sessionSql = 'SELECT session_string FROM sessions WHERE id = ?';
  const session = await new Promise((resolve, reject) => {
    db.get(sessionSql, [session_id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  // Get delay configuration
  const delaySql = 'SELECT delay_between_channels_ms FROM delays WHERE project_id = ?';
  const delay = await new Promise((resolve, reject) => {
    db.get(delaySql, [project_id], (err, row) => {
      if (err) resolve({ delay_between_channels_ms: 30000 }); // Default to 30 seconds
      else resolve(row || { delay_between_channels_ms: 30000 });
    });
  });
  
  // Add job to queue with delay
  const jobData = {
    run_id,
    project_id,
    session_id,  // Include session_id for locking
    session_string: session.session_string,
    chat_id: channel.chat_id,
    type: message.message_type,
    file_path,
    caption: message.caption,
    ...options
  };
  
  const job = await sendQueue.add('send message', jobData, {
    delay: delay.delay_between_channels_ms,  // Delay before processing
    attempts: 3,  // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000  // Start with 2s, then 4s, then 8s between retries
    }
  });
  
  return job;
};

module.exports = {
  sendQueue,
  worker,
  addSendMessageJob,
  redisConnection
};