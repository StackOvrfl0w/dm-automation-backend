const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const flowController = require('../controllers/flowController');

const router = express.Router();

const createFlowValidation = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Flow name must be at least 2 characters'),
  body('instagramAccountId')
    .notEmpty()
    .withMessage('Instagram account ID required'),
  body('triggerType')
    .isIn(['keyword_dm', 'story_reply', 'comment_keyword', 'lead_capture', 'ai_reply'])
    .withMessage('Invalid trigger type'),
  body('triggerConfig')
    .isObject()
    .withMessage('Trigger config must be an object'),
  body('steps')
    .isArray()
    .withMessage('Steps must be an array'),
];

const updateFlowValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Flow name must be at least 2 characters'),
  body('triggerConfig')
    .optional()
    .isObject()
    .withMessage('Trigger config must be an object'),
  body('steps')
    .optional()
    .isArray()
    .withMessage('Steps must be an array'),
];

router.get('/', authenticate, flowController.getFlows);
router.post('/', authenticate, createFlowValidation, flowController.createFlow);
router.get('/:id', authenticate, flowController.getFlow);
router.put('/:id', authenticate, updateFlowValidation, flowController.updateFlow);
router.delete('/:id', authenticate, flowController.deleteFlow);
router.patch('/:id/toggle', authenticate, flowController.toggleFlow);

module.exports = router;
