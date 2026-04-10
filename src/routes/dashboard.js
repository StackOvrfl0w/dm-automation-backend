const express = require('express');
const authenticate = require('../middleware/authenticate');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/stats', authenticate, dashboardController.getDashboardStats);

module.exports = router;
