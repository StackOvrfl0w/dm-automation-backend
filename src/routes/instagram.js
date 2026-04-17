const express = require('express');
const authenticate = require('../middleware/authenticate');
const instagramController = require('../controllers/instagramController');

const router = express.Router();

router.get('/connect', authenticate, instagramController.getConnectUrl);
router.get('/accounts', authenticate, instagramController.getConnectedAccounts);
router.get('/callback', instagramController.handleCallback);
router.delete('/disconnect/:accountId', authenticate, instagramController.disconnectAccount);

module.exports = router;
