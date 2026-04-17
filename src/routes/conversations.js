const express = require('express');
const authenticate = require('../middleware/authenticate');
const conversationController = require('../controllers/conversationController');

const router = express.Router();

router.get('/', authenticate, conversationController.getConversations);
router.get('/:id/messages', authenticate, conversationController.getConversationMessages);

module.exports = router;
