import logger from '../utils/logger.js';

/**
 * Standardized error handling middleware, especially for the Partner API.
 * Captures the exception, logs it via Winston, and returns a consistent JSON error to the client.
 */
export const partnerApiErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    // Redact sensitive info from request body if we log it
    const reqBody = { ...req.body };
    if (reqBody.ssn) reqBody.ssn = `***-**-${reqBody.ssn.slice(-4)}`;
    if (reqBody.livenessData) reqBody.livenessData = '[REDACTED]';

    // Log the error with full context
    logger.error(`Partner API Error [${req.method} ${req.originalUrl}]`, {
        error: err.message,
        stack: err.stack,
        partnerId: req.partnerId || 'UNKNOWN_PARTNER',
        tenantId: req.tenantId || 'UNKNOWN_TENANT',
        ip: req.ip,
        requestBody: reqBody
    });

    // Don't leak stack traces in production to the client
    const responseError = process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: responseError,
        // Optional: Include an error reference ID so the partner can quote it in support tickets
        referenceId: `ERR-${Date.now()}`
    });
};
