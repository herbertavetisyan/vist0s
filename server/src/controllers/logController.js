import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, '../../logs');

export const getLogFiles = async (req, res) => {
    try {
        if (!fs.existsSync(logsDir)) {
            return res.status(200).json([]);
        }

        const files = fs.readdirSync(logsDir)
            .filter(file => file.endsWith('.log'))
            .map(file => {
                const stats = fs.statSync(path.join(logsDir, file));
                return {
                    name: file,
                    size: stats.size,
                    mtime: stats.mtime
                };
            })
            // Sort by modified time descending (newest first)
            .sort((a, b) => b.mtime - a.mtime);

        res.status(200).json(files);
    } catch (error) {
        console.error('Failed to list log files:', error);
        res.status(500).json({ error: 'Failed to list log files' });
    }
};

export const getLogContent = async (req, res) => {
    try {
        const { filename } = req.params;

        // Basic security check to prevent directory traversal
        if (!filename.endsWith('.log') || filename.includes('..') || filename.includes('/')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        const filePath = path.join(logsDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Log file not found' });
        }

        // Read file and parse JSON lines
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim().length > 0);

        const parsedLogs = lines.map((line, index) => {
            try {
                const parsed = JSON.parse(line);
                parsed.id = `${filename}-${index}`; // Add a unique ID for React lists
                return parsed;
            } catch (e) {
                // If it's not JSON (e.g. an unhandled exception trace that spanned multiple lines), 
                // wrap it as a generic message payload
                return {
                    id: `${filename}-${index}`,
                    level: 'error',
                    message: line,
                    timestamp: new Date().toISOString(),
                    service: 'vistos-api-raw'
                };
            }
        });

        res.status(200).json(parsedLogs);
    } catch (error) {
        console.error(`Failed to read log file ${req.params.filename}:`, error);
        res.status(500).json({ error: 'Failed to read log file' });
    }
};
