const express = require('express');
const webhookController = require('../controllers/webhookController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.get('/instagram', webhookController.verifyWebhook);
router.post('/instagram', webhookController.handleWebhook);
router.get('/events', authenticate, webhookController.getWebhookEvents);

module.exports = router;
