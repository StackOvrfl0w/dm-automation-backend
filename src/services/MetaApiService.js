const axios = require('axios');
const config = require('../config/env');

const INSTAGRAM_GRAPH_API_BASE_URL = 'https://graph.instagram.com';
const FACEBOOK_GRAPH_API_BASE_URL = `https://graph.facebook.com/${config.meta.graphApiVersion}`;

const instagramAxios = axios.create({
  baseURL: INSTAGRAM_GRAPH_API_BASE_URL,
  timeout: 10000,
});

const facebookAxios = axios.create({
  baseURL: FACEBOOK_GRAPH_API_BASE_URL,
  timeout: 10000,
});

const sendDirectMessage = async (accessToken, recipientId, messageText) => {
  try {
    const response = await facebookAxios.post('/me/messages', {
      recipient: { id: recipientId },
      message: { text: messageText },
      access_token: accessToken,
    });

    return response.data;
  } catch (error) {
    console.error('Failed to send message:', error.response?.data || error.message);
    throw new Error(`Meta API error: ${error.response?.data?.error?.message || error.message}`);
  }
};

const refreshAccessToken = async (currentToken) => {
  try {
    const response = await instagramAxios.get('/refresh_access_token', {
      params: {
        grant_type: 'ig_refresh_token',
        access_token: currentToken,
      },
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in,
    };
  } catch (error) {
    console.error('Failed to refresh token:', error.response?.data || error.message);
    throw new Error('Token refresh failed');
  }
};

const getInstagramUserInfo = async (accessToken) => {
  try {
    const response = await instagramAxios.get('/me', {
      params: {
        access_token: accessToken,
        fields: 'id,username,account_type',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to get user info:', error.response?.data || error.message);
    throw new Error('Failed to fetch Instagram user info');
  }
};

const exchangeFacebookCodeForAccessToken = async (code) => {
  try {
    const response = await axios.get(`https://graph.facebook.com/${config.meta.graphApiVersion}/oauth/access_token`, {
      params: {
        client_id: config.meta.facebookAppId,
        client_secret: config.meta.appSecret,
        redirect_uri: config.meta.redirectUri,
        code,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to exchange Facebook OAuth code:', error.response?.data || error.message);
    throw new Error('Failed to exchange authorization code');
  }
};

const exchangeFacebookForLongLivedToken = async (shortLivedToken) => {
  try {
    const response = await axios.get(`https://graph.facebook.com/${config.meta.graphApiVersion}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: config.meta.facebookAppId,
        client_secret: config.meta.appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to exchange long-lived Facebook token:', error.response?.data || error.message);
    throw new Error('Failed to exchange long-lived token');
  }
};

const getInstagramBusinessAccountFromUser = async (userAccessToken) => {
  try {
    const response = await facebookAxios.get('/me/accounts', {
      params: {
        access_token: userAccessToken,
        fields: 'id,name,access_token,connected_instagram_account{id,username}',
      },
    });

    const pages = response.data?.data || [];
    const pageWithInstagram = pages.find((page) => page.connected_instagram_account?.id);

    if (!pageWithInstagram) {
      throw new Error('No Instagram professional account connected to any managed Facebook page');
    }

    return {
      pageId: pageWithInstagram.id,
      pageName: pageWithInstagram.name,
      pageAccessToken: pageWithInstagram.access_token,
      instagramUserId: pageWithInstagram.connected_instagram_account.id,
      username: pageWithInstagram.connected_instagram_account.username,
    };
  } catch (error) {
    console.error('Failed to fetch Facebook pages/Instagram account:', error.response?.data || error.message);
    throw new Error('Failed to fetch connected Instagram business account');
  }
};

const getInstagramBusinessUserInfo = async (accessToken, instagramUserId) => {
  try {
    const response = await facebookAxios.get(`/${instagramUserId}`, {
      params: {
        access_token: accessToken,
        fields: 'id,username,name,account_type',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to fetch Instagram business user info:', error.response?.data || error.message);
    throw new Error('Failed to fetch Instagram business user info');
  }
};

module.exports = {
  sendDirectMessage,
  refreshAccessToken,
  getInstagramUserInfo,
  exchangeFacebookCodeForAccessToken,
  exchangeFacebookForLongLivedToken,
  getInstagramBusinessAccountFromUser,
  getInstagramBusinessUserInfo,
};
