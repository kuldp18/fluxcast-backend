/**
 * Express error handler.
 */
function errorHandler(err, req, res, next) {
  // express-openapi-validator uses these fields.
  const status = err.status || err.statusCode || 500;

  // Preserve OpenAPI validator's detailed errors for debugging.
  const message = err.message || 'Internal server error';

  // Always send the API's Error schema shape.
  res.status(status).json({
    error: true,
    message,
  });
}

export { errorHandler };
