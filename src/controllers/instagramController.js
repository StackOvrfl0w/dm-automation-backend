const axios = require('axios');
const InstagramAccount = require('../models/InstagramAccount');
const MetaApiService = require('../services/MetaApiService');
const { sendSuccess, sendError } = require('../utils/response');
const config = require('../config/env');
const { encrypt } = require('../utils/encryption');

const getConnectUrl = (req, res) => {
  const scope = 'instagram_basic,instagram_graph_user_media';
  const state = Math.random().toString(36).substring(7);

  const authUrl = `https://api.instagram.com/oauth/authorize?` +
    `client_id=${config.meta.appId}&` +
    `redirect_uri=${encodeURIComponent(config.meta.redirectUri)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_type=code&` +
    `state=${state}`;

  return sendSuccess(res, { url: authUrl }, 'Connect URL generated', 200);
};

const handleCallback = async (req, res, next) => {
  try {
    const { code } = req.query;

    if (!code) {
      return sendError(res, 'No authorization code provided', 400);
    }

    const tokenResponse = await axios.post(
      'https://graph.instagram.com/v21.0/access_token',
      {
        client_id: config.meta.appId,
        client_secret: config.meta.appSecret,
        grant_type: 'authorization_code',
        redirect_uri: config.meta.redirectUri,
        code,
      }
    );

    const { access_token, user_id } = tokenResponse.data;

    const userInfo = await MetaApiService.getInstagramUserInfo(access_token);

    const encryptedToken = encrypt(access_token);

    let account = await InstagramAccount.findOne({
      instagramUserId: user_id,
    });

    if (account) {
      account.accessToken = encryptedToken;
      account.tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      account.isActive = true;
    } else {
      account = new InstagramAccount({
        userId: req.userId,
        instagramUserId: user_id,
        username: userInfo.username,
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        accountType: userInfo.ig_metadata?.account_type || 'creator',
      });
    }

    await account.save();

    res.redirect(`${config.client.url}/dashboard?accountConnected=true`);
  } catch (error) {
    console.error('OAuth callback error:', error.message);
    next(error);
  }
};

const disconnectAccount = async (req, res, next) => {
  try {
    const account = await InstagramAccount.findOneAndDelete({
      _id: req.params.accountId,
      userId: req.userId,
    });

    if (!account) {
      return sendError(res, 'Account not found', 404);
    }

    return sendSuccess(res, null, 'Account disconnected', 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConnectUrl,
  handleCallback,
  disconnectAccount,
};
