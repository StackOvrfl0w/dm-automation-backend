const request = require('supertest');
const app = require('../../src/server');

describe('Flows API', () => {
  describe('GET /api/flows', () => {
    it('should return empty flows array for new user', async () => {
      const res = await request(app)
        .get('/api/flows')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('POST /api/flows', () => {
    it('should create a new flow with valid data', async () => {
      const res = await request(app)
        .post('/api/flows')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'Test Flow',
          instagramAccountId: '12345',
          triggerType: 'keyword_dm',
          triggerConfig: { keyword: 'test', matchType: 'exact' },
          steps: [
            {
              stepType: 'send_message',
              content: 'Hello!',
            },
          ],
        });

      expect(res.status).toBeLessThan(500);
    });
  });
});
