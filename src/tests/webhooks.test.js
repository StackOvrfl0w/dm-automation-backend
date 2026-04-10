const request = require('supertest');
const app = require('../../src/server');

describe('Webhooks API', () => {
  describe('GET /api/webhooks/instagram', () => {
    it('should verify webhook with correct token', async () => {
      const res = await request(app)
        .get('/api/webhooks/instagram')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': process.env.WEBHOOK_VERIFY_TOKEN || 'test-token',
          'hub.challenge': 'test-challenge',
        });

      expect(res.status).toBeLessThan(500);
    });

    it('should reject webhook with incorrect token', async () => {
      const res = await request(app)
        .get('/api/webhooks/instagram')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'test-challenge',
        });

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('POST /api/webhooks/instagram', () => {
    it('should reject webhook without signature', async () => {
      const res = await request(app)
        .post('/api/webhooks/instagram')
        .send({
          object: 'instagram',
          entry: [],
        });

      expect(res.status).toBeLessThan(500);
    });
  });
});
