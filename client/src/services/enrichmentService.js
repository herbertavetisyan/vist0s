import api from './api';

/**
 * Create a new enrichment request
 */
export const createEnrichmentRequest = async (data) => {
    const response = await api.post('/enrichment', data);
    return response.data;
};

/**
 * Get enrichment request status and results
 */
export const getEnrichmentRequest = async (id) => {
    const response = await api.get(`/enrichment/${id}`);
    return response.data;
};

/**
 * List all enrichment requests
 */
export const listEnrichmentRequests = async (params = {}) => {
    const { limit = 50, offset = 0 } = params;
    const response = await api.get('/enrichment', {
        params: { limit, offset }
    });
    return response.data;
};

/**
 * Poll for enrichment request completion
 * Returns a promise that resolves when the request is complete
 */
export const pollEnrichmentRequest = async (id, options = {}) => {
    const { interval = 2000, maxAttempts = 60 } = options;

    let attempts = 0;

    return new Promise((resolve, reject) => {
        const poll = async () => {
            try {
                attempts++;
                const data = await getEnrichmentRequest(id);

                // Check if complete
                if (data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'PARTIAL') {
                    resolve(data);
                    return;
                }

                // Check max attempts
                if (attempts >= maxAttempts) {
                    reject(new Error('Polling timeout'));
                    return;
                }

                // Continue polling
                setTimeout(poll, interval);
            } catch (error) {
                reject(error);
            }
        };

        poll();
    });
};
