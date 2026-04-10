const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    const errors = Object.keys(err.errors).map((field) => ({
      field,
      message: err.errors[field].message,
    }));
    return sendError(res, 'Validation failed', 400, errors);
  }

  if (err.name === 'CastError') {
    return sendError(res, 'Invalid ID format', 400);
  }

  if (err.status && err.message) {
    return sendError(res, err.message, err.status);
  }

  return sendError(res, 'Internal server error', 500);
};

module.exports = errorHandler;
