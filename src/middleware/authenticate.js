const { verifyAccessToken } = require('../utils/tokens');
const { sendError } = require('../utils/response');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Missing or invalid authorization header', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return sendError(res, 'Invalid or expired token', 401);
  }

  req.userId = decoded.userId;
  next();
};

module.exports = authenticate;
