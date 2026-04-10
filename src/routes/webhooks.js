const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

router.get('/instagram', webhookController.verifyWebhook);
router.post('/instagram', webhookController.handleWebhook);

module.exports = router;
