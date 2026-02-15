/**
 * Feature Flags Configuration
 * Control feature availability across different environments
 */

const featureFlags = {
    // Enrichment mock mode is controlled via environment variable
    enrichmentMockMode: process.env.ENRICHMENT_MOCK_MODE === 'true',

    // Future feature flags can be added here
    newDashboard: process.env.ENABLE_NEW_DASHBOARD === 'true',
    sumsubVerification: process.env.ENABLE_SUMSUB === 'true',
};

module.exports = featureFlags;
