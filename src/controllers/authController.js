const { validationResult } = require('express-validator');
const AuthService = require('../services/AuthService');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/tokens');
const { sendSuccess, sendError } = require('../utils/response');
const User = require('../models/User');

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { email, password, name } = req.body;
    const user = await AuthService.registerUser(email, password, name);

    return sendSuccess(res, user, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await AuthService.loginUser(email, password);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return sendSuccess(
      res,
      { user, accessToken },
      'Login successful',
      200
    );
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return sendError(res, 'No refresh token provided', 401);
    }

    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return sendError(res, 'Invalid or expired refresh token', 401);
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const newAccessToken = generateAccessToken(user._id);

    return sendSuccess(res, { accessToken: newAccessToken }, 'Token refreshed', 200);
  } catch (error) {
    next(error);
  }
};

const logout = (req, res) => {
  res.clearCookie('refreshToken');
  return sendSuccess(res, null, 'Logged out successfully', 200);
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};
