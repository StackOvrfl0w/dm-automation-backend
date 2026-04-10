const express = require('express');
const authenticate = require('../middleware/authenticate');
const leadsController = require('../controllers/leadsController');

const router = express.Router();

router.get('/', authenticate, leadsController.getLeads);
router.get('/:id', authenticate, leadsController.getLead);
router.delete('/:id', authenticate, leadsController.deleteLead);

module.exports = router;
