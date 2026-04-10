const axios = require('axios');
const config = require('../config/env');

const API_BASE_URL = `https://graph.instagram.com/${config.meta.graphApiVersion}`;

const metaAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

const sendDirectMessage = async (accessToken, recipientId, messageText) => {
  try {
    const response = await metaAxios.post('/me/messages', {
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
    const response = await metaAxios.post('/refresh_access_token', {
      grant_type: 'ig_refresh_token',
      access_token: currentToken,
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
    const response = await metaAxios.get('/me', {
      params: {
        access_token: accessToken,
        fields: 'id,username,name,ig_metadata',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to get user info:', error.response?.data || error.message);
    throw new Error('Failed to fetch Instagram user info');
  }
};

module.exports = {
  sendDirectMessage,
  refreshAccessToken,
  getInstagramUserInfo,
};
