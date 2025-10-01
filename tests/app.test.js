const request = require('supertest');

// Import the app differently to avoid module issues
let app;
let db;

beforeAll(async () => {
  // Dynamically import the app to avoid module loading issues
  const appModule = await import('../backend/server.js');
  app = appModule.default || appModule;
  
  const dbModule = await import('../backend/db.js');
  db = dbModule;
  
  // Initialize database
  if (db.initDB) {
    db.initDB();
  }
});

describe('Telegram App API', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'OK',
        service: 'telegram-app-backend'
      });
    });
  });

  describe('Session API', () => {
    it('should create a new session', async () => {
      const newSession = {
        name: 'Test Session',
        session_string: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ'
      };

      const response = await request(app)
        .post('/api/sessions')
        .send(newSession);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(newSession.name);
    });

    it('should get all sessions', async () => {
      const response = await request(app).get('/api/sessions');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Project API', () => {
    it('should create a new project', async () => {
      const newProject = {
        name: 'Test Project',
        description: 'A test project'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(newProject);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(newProject.name);
    });

    it('should get all projects', async () => {
      const response = await request(app).get('/api/projects');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});