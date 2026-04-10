const formatSuccess = (data, message = 'Success', code = 200) => {
  return {
    success: true,
    code,
    message,
    data,
  };
};

const formatError = (message = 'Error', code = 500, errors = null) => {
  return {
    success: false,
    code,
    message,
    errors,
  };
};

const sendSuccess = (res, data, message = 'Success', code = 200) => {
  return res.status(code).json(formatSuccess(data, message, code));
};

const sendError = (res, message = 'Error', code = 500, errors = null) => {
  return res.status(code).json(formatError(message, code, errors));
};

module.exports = {
  formatSuccess,
  formatError,
  sendSuccess,
  sendError,
};
