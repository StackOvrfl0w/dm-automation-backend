const bcrypt = require('bcrypt');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokens');

const registerUser = async (email, password, name) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    const error = new Error('Email already registered');
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = new User({
    email,
    passwordHash,
    name,
  });

  await user.save();

  return {
    id: user._id,
    email: user.email,
    name: user.name,
    plan: user.plan,
  };
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  return {
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      plan: user.plan,
    },
    accessToken,
    refreshToken,
  };
};

module.exports = {
  registerUser,
  loginUser,
};
