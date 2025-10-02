const { Queue, Worker, Job } = require('bullmq');
const { db } = require('./db');
const axios = require('axios');
const IORedis = require('ioredis');

// Helper function to check if all jobs are complete and update project status
const checkAndUpdateProjectStatus = async (run_id, project_id) => {
  return new Promise((resolve, reject) => {
    // Get current stats
    const getStatsSql = 'SELECT stats FROM process_runs WHERE id = ?';
    db.get(getStatsSql, [run_id], (err, row) => {
      if (err) {
        console.error('Error getting stats:', err);
        return reject(err);
      }
      
      if (!row || !row.stats) {
        return resolve(false);
      }
      
      const stats = JSON.parse(row.stats);
      const totalJobs = stats.total_jobs || 0;
      const completedJobs = stats.completed_jobs || 0;
      
      console.log(`[Status Check] Run ${run_id}: ${completedJobs}/${totalJobs} jobs completed`);
      
      // Check if all jobs are complete
      if (totalJobs > 0 && completedJobs >= totalJobs) {
        console.log(`[Status Check] All jobs completed for run ${run_id}. Stopping project ${project_id}...`);
        
        // Update project status to stopped
        const updateProjectSql = 'UPDATE projects SET status = ? WHERE id = ?';
        db.run(updateProjectSql, ['stopped', project_id], (projectErr) => {
          if (projectErr) {
            console.error('Error updating project status:', projectErr);
            return reject(projectErr);
          }
          
          // Update process run status to completed
          const updateRunSql = 'UPDATE process_runs SET status = ?, updated_at = datetime("now") WHERE id = ?';
          db.run(updateRunSql, ['completed', run_id], (runErr) => {
            if (runErr) {
              console.error('Error updating run status:', runErr);
              return reject(runErr);
            }
            
            console.log(`[Status Check] ✅ Project ${project_id} stopped successfully`);
            resolve(true);
          });
        });
      } else {
        resolve(false);
      }
    });
  });
};

// BullMQ connection configuration (uses ioredis internally)
const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

console.log('Redis connection config:', redisConnection);

// Create a separate ioredis client for lock management
const redisClient = new IORedis(redisConnection);

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis client connected for lock management');
});

// Create queues for different types of jobs
const sendQueue = new Queue('send message', { connection: redisConnection });

// Initialize the worker to process jobs
const worker = new Worker('send message', async (job) => {
  const { session_string, chat_id, type, file_path, caption, reply_to_message_id, run_id } = job.data;
  
  console.log(`[Worker] Processing job ${job.id} for chat ${chat_id}`);
  
  // Acquire lock for the session to prevent concurrent usage
  const lockKey = `session_lock:${job.data.session_id}`;
  const lockValue = `worker_${process.pid}_${Date.now()}`;
  const lockTimeout = 300000; // 5 minutes
  
  // Try to acquire the lock
  const lockAcquired = await redisClient.set(
    lockKey, 
    lockValue, 
    'PX', lockTimeout,
    'NX'
  );
  
  if (!lockAcquired) {
    console.log(`[Worker] Session ${job.data.session_id} is locked by another process`);
    throw new Error(`Session ${job.data.session_id} is locked by another process`);
  }
  
  try {
    // Call the Python service to send the message
    const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    console.log(`[Worker] Calling Python service at ${PYTHON_SERVICE_URL}/send_message`);
    const response = await axios.post(`${PYTHON_SERVICE_URL}/send_message`, {
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
    
    // Update the process run stats (success count only, completed will be tracked by events)
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
    // Update the process run stats for failure (error count only)
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
    const currentLockValue = await redisClient.get(lockKey);
    if (currentLockValue === lockValue) {
      await redisClient.del(lockKey);
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
  
  // Get caption from text file if caption_message_id is provided
  let caption = message.caption;
  if (options.caption_message_id) {
    const captionMessageSql = 'SELECT content_ref FROM project_messages WHERE id = ?';
    const captionMessage = await new Promise((resolve, reject) => {
      db.get(captionMessageSql, [options.caption_message_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    // Read text file content for caption
    if (captionMessage && captionMessage.content_ref) {
      const fs = require('fs');
      const path = require('path');
      const captionFileSql = 'SELECT path FROM files WHERE id = ?';
      const captionFile = await new Promise((resolve, reject) => {
        db.get(captionFileSql, [captionMessage.content_ref], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (captionFile && captionFile.path) {
        try {
          caption = fs.readFileSync(captionFile.path, 'utf8');
        } catch (err) {
          console.error('Error reading caption file:', err);
        }
      }
    }
  }
  
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
  } else {
    // For text messages, read the content from file
    const fileSql = 'SELECT path FROM files WHERE id = ?';
    const file = await new Promise((resolve, reject) => {
      db.get(fileSql, [message.content_ref], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (file && file.path) {
      const fs = require('fs');
      try {
        // Read text content and store in caption field for text messages
        caption = fs.readFileSync(file.path, 'utf8');
      } catch (err) {
        console.error('Error reading text file:', err);
      }
    }
  }
  
  // Get channel details
  const channelSql = 'SELECT chat_id FROM channels WHERE id = ?';
  const channel = await new Promise((resolve, reject) => {
    db.get(channelSql, [target_channel_id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  if (!channel || !channel.chat_id) {
    throw new Error(`Channel not found or has no chat_id for target_channel_id: ${target_channel_id}`);
  }
  
  // Get session details
  const sessionSql = 'SELECT session_string FROM sessions WHERE id = ?';
  const session = await new Promise((resolve, reject) => {
    db.get(sessionSql, [session_id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  if (!session || !session.session_string) {
    throw new Error(`Session not found or has no session_string for session_id: ${session_id}`);
  }
  
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
    caption: caption,  // Use the caption we prepared (from text file or original)
    ...options
  };
  
  console.log(`[Queue] Adding job for channel ${channel.chat_id}, message type: ${message.message_type}`);
  
  // Use job_index from options to create sequential delays
  const jobDelay = options.job_index 
    ? delay.delay_between_channels_ms * options.job_index 
    : delay.delay_between_channels_ms;
  
  const job = await sendQueue.add('send message', jobData, {
    delay: jobDelay,  // Sequential delay based on job index
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
  redisClient,
  checkAndUpdateProjectStatus
};