/**
 * response.js
 * Item 107: Standard API Response Envelopes
 * Ensures consistent structure: { success, data, meta, error }
 */

const { AppError } = require('@hearth/shared');

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {any} data - The primary data payload
 * @param {Object} [meta] - Pagination or other metadata
 * @param {number} [status=200] - HTTP Status
 */
function success(res, data, meta = null, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    meta,
  });
}

/**
 * Send an error response (Used by Global Handler)
 * @param {Object} res - Express response object
 * @param {string|Error} err - Error message or Error object
 * @param {any} [details] - Detailed validation errors or stacks
 * @param {number} [status=500] - HTTP Status
 */
function error(res, err, details = null, status = 500) {
  let message = typeof err === 'string' ? err : err.message;
  let finalStatus = status;
  let finalDetails = details;

  if (err instanceof AppError) {
    finalStatus = err.statusCode;
    if (err.errors) finalDetails = err.errors;
  }

  return res.status(finalStatus).json({
    success: false,
    error: message,
    details: finalDetails,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

module.exports = { success, error };
