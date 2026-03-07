import winston from 'winston';
import path from 'path';
import 'winston-daily-rotate-file';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let out = `[${timestamp}] ${level}: ${message}`;
        if (Object.keys(meta).length > 0) {
            out += ` ${JSON.stringify(meta)}`;
        }
        if (stack) {
            out += `\n${stack}`;
        }
        return out;
    })
);

// Define log directory (creates it if it doesn't exist)
const logDir = path.join(process.cwd(), 'logs');

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'vistos-api' },
    transports: [
        // Error logs
        new winston.transports.DailyRotateFile({
            dirname: logDir,
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxFiles: '30d',
            maxSize: '20m',
            zippedArchive: true,
        }),
        // Partner API specific logs
        new winston.transports.DailyRotateFile({
            dirname: logDir,
            filename: 'partner-api-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            maxSize: '20m',
            zippedArchive: true,
        }),
    ],
});

// If we're not in production, log to console as well
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: consoleFormat,
            level: 'debug', // Allow debug logs in non-production
        })
    );
}

// Redaction utility for sensitive data
export const redactSensitiveData = (data) => {
    if (!data) return data;

    // Create a deep copy to avoid mutating original
    const redacted = JSON.parse(JSON.stringify(data));

    // Redact SSN
    if (redacted.ssn) {
        redacted.ssn = `***-**-${redacted.ssn.slice(-4)}`;
    }

    // Don't log full biometrics/liveness data as it can be huge and sensitive
    if (redacted.livenessData) {
        redacted.livenessData = {
            redacted: true,
            timestamp: redacted.livenessData?.timestamp || new Date().toISOString()
        };
    }

    if (redacted.selfieData) {
        redacted.selfieData = '[REDACTED_SELFIE_URL]';
    }

    return redacted;
};

export default logger;
