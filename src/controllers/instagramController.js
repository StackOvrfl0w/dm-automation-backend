const axios = require('axios');
const crypto = require('crypto');
const InstagramAccount = require('../models/InstagramAccount');
const MetaApiService = require('../services/MetaApiService');
const { sendSuccess, sendError } = require('../utils/response');
const config = require('../config/env');
const { encrypt } = require('../utils/encryption');

const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

const createSignedState = (payload) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const stateSecret = config.jwt.accessSecret || config.jwt.refreshSecret || 'oauth-state-secret';
  const signature = crypto.createHmac('sha256', stateSecret).update(encodedPayload).digest('hex');
  return `${encodedPayload}.${signature}`;
};

const parseSignedState = (state) => {
  if (!state || typeof state !== 'string' || !state.includes('.')) {
    return null;
  }

  const [encodedPayload, signature] = state.split('.');
  const stateSecret = config.jwt.accessSecret || config.jwt.refreshSecret || 'oauth-state-secret';
  const expectedSignature = crypto.createHmac('sha256', stateSecret).update(encodedPayload).digest('hex');

  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedSignatureBuffer = Buffer.from(expectedSignature, 'hex');

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));

    if (!payload?.uid || !payload?.mode || !payload?.ts) {
      return null;
    }

    if (Date.now() - payload.ts > OAUTH_STATE_MAX_AGE_MS) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
};

const redirectWithResult = (res, isSuccess, message, mode = 'business') => {
  const params = new URLSearchParams({
    accountConnected: isSuccess ? 'true' : 'false',
    provider: mode,
  });

  if (message) {
    params.set('message', message);
  }

  res.redirect(`${config.client.url}/dashboard?${params.toString()}`);
};

const upsertInstagramAccount = async ({
  userId,
  instagramUserId,
  username,
  accessToken,
  expiresInSeconds,
  accountType,
}) => {
  const encryptedToken = encrypt(accessToken);
  const tokenExpiresAt = expiresInSeconds
    ? new Date(Date.now() + Number(expiresInSeconds) * 1000)
    : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  let account = await InstagramAccount.findOne({ instagramUserId: String(instagramUserId) });

  if (account) {
    account.userId = userId;
    account.username = username;
    account.accessToken = encryptedToken;
    account.tokenExpiresAt = tokenExpiresAt;
    account.accountType = accountType;
    account.isActive = true;
  } else {
    account = new InstagramAccount({
      userId,
      instagramUserId: String(instagramUserId),
      username,
      accessToken: encryptedToken,
      tokenExpiresAt,
      accountType,
      isActive: true,
    });
  }

  await account.save();
};

const getConnectUrl = (req, res) => {
  const mode = req.query.mode === 'basic' ? 'basic' : 'business';
  const state = createSignedState({
    uid: req.userId,
    mode,
    nonce: Math.random().toString(36).slice(2, 10),
    ts: Date.now(),
  });

  if (mode === 'business') {
    const scope = [
      'instagram_basic',
      'instagram_manage_messages',
      'instagram_manage_comments',
      'pages_show_list',
      'pages_read_engagement',
      'business_management',
    ].join(',');

    const authUrl =
      `https://www.facebook.com/${config.meta.graphApiVersion}/dialog/oauth?` +
      `client_id=${config.meta.facebookAppId}&` +
      `redirect_uri=${encodeURIComponent(config.meta.redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=code&` +
      `state=${encodeURIComponent(state)}`;

    return sendSuccess(res, { url: authUrl, mode }, 'Connect URL generated', 200);
  }

  const scope = 'instagram_basic,instagram_graph_user_media';
  const authUrl =
    `https://api.instagram.com/oauth/authorize?` +
    `client_id=${config.meta.appId}&` +
    `redirect_uri=${encodeURIComponent(config.meta.redirectUri)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_type=code&` +
    `state=${encodeURIComponent(state)}`;

  return sendSuccess(res, { url: authUrl, mode }, 'Connect URL generated', 200);
};

const handleCallback = async (req, res, next) => {
  let mode = 'business';

  try {
    const providerError = req.query.error_reason || req.query.error || req.query.error_message;

    if (providerError) {
      return redirectWithResult(res, false, providerError, 'business');
    }

    const { code, state } = req.query;
    const statePayload = parseSignedState(state);

    if (!statePayload) {
      return sendError(res, 'Invalid or expired OAuth state parameter', 400);
    }

    const userIdFromState = statePayload.uid;
    mode = statePayload.mode === 'basic' ? 'basic' : 'business';

    if (!code) {
      return sendError(res, 'No authorization code provided', 400);
    }

    if (mode === 'business') {
      const shortLivedTokenData = await MetaApiService.exchangeFacebookCodeForAccessToken(code);

      let tokenData = shortLivedTokenData;

      try {
        const longLivedTokenData = await MetaApiService.exchangeFacebookForLongLivedToken(
          shortLivedTokenData.access_token
        );
        tokenData = {
          access_token: longLivedTokenData.access_token,
          expires_in: longLivedTokenData.expires_in,
        };
      } catch (error) {
        // Keep short-lived token if long-lived exchange fails.
      }

      const linkedAccount = await MetaApiService.getInstagramBusinessAccountFromUser(tokenData.access_token);
      const effectiveToken = linkedAccount.pageAccessToken || tokenData.access_token;
      const businessInfo = await MetaApiService.getInstagramBusinessUserInfo(
        effectiveToken,
        linkedAccount.instagramUserId
      );

      await upsertInstagramAccount({
        userId: userIdFromState,
        instagramUserId: linkedAccount.instagramUserId,
        username: businessInfo.username || linkedAccount.username || `ig_${linkedAccount.instagramUserId}`,
        accessToken: effectiveToken,
        expiresInSeconds: tokenData.expires_in,
        accountType: 'business',
      });

      return redirectWithResult(res, true, 'business_account_connected', mode);
    }

    const body = new URLSearchParams({
      client_id: config.meta.appId,
      client_secret: config.meta.appSecret,
      grant_type: 'authorization_code',
      redirect_uri: config.meta.redirectUri,
      code,
    });

    const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, user_id } = tokenResponse.data;

    const userInfo = await MetaApiService.getInstagramUserInfo(access_token);

    const accountType = String(userInfo.account_type || 'creator').toLowerCase();

    await upsertInstagramAccount({
      userId: userIdFromState,
      instagramUserId: user_id,
      username: userInfo.username || `ig_${user_id}`,
      accessToken: access_token,
      expiresInSeconds: 60 * 24 * 60 * 60,
      accountType: accountType === 'business' ? 'business' : 'creator',
    });

    return redirectWithResult(res, true, 'basic_account_connected', mode);
  } catch (error) {
    console.error('OAuth callback error:', error.message);
    return redirectWithResult(res, false, 'oauth_callback_failed', mode);
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

const getConnectedAccounts = async (req, res, next) => {
  try {
    const accounts = await InstagramAccount.find({ userId: req.userId })
      .select('-accessToken')
      .sort({ connectedAt: -1 })
      .lean();

    const now = Date.now();
    const accountsWithStatus = accounts.map((account) => {
      const expiresAt = account.tokenExpiresAt ? new Date(account.tokenExpiresAt).getTime() : null;
      const tokenExpiresInMs = expiresAt ? expiresAt - now : null;

      return {
        ...account,
        tokenStatus:
          tokenExpiresInMs === null
            ? 'unknown'
            : tokenExpiresInMs <= 0
              ? 'expired'
              : tokenExpiresInMs <= 24 * 60 * 60 * 1000
                ? 'expiring_soon'
                : 'valid',
      };
    });

    return sendSuccess(res, { accounts: accountsWithStatus }, 'Connected accounts fetched', 200);
  } catch (error) {
    console.error('Get connected accounts error:', error.message);
    next(error);
  }
};

module.exports = {
  getConnectUrl,
  handleCallback,
  disconnectAccount,
  getConnectedAccounts,
};
