/**
 * Scoring Service
 * Calculates the approved credit limit and terms based on enrichment data.
 */

class ScoringService {
    /**
     * Calculate approved offer for a loan application
     * @param {object} enrichmentData - Aggregated data from NORQ, EKENG, etc.
     * @param {object} requestedParams - { amountRequested, termRequested }
     * @returns {object} { approvedLimit, approvedTerm, interestRate }
     */
    async calculateOffer(enrichmentData, requestedParams) {
        console.log('[Scoring] Calculating offer based on enrichment data...');

        // 1. Extract key metrics
        const creditScore = enrichmentData.norq?.creditScore || 0;
        const monthlySalary = enrichmentData.ekeng?.salary?.amount || 0;
        const riskLevel = enrichmentData.norq?.riskLevel || 'HIGH';

        // 2. Basic eligibility check
        if (creditScore < 500 || monthlySalary < 100000) {
            return {
                approvedLimit: 0,
                approvedTerm: 0,
                interestRate: 0,
                rejected: true,
                reason: 'Does not meet minimum credit or income requirements.'
            };
        }

        // 3. Logic: approved limit is 3x monthly salary as a baseline
        let approvedLimit = monthlySalary * 3;

        // adjust based on credit score
        if (creditScore > 750) {
            approvedLimit = monthlySalary * 6;
        } else if (creditScore > 650) {
            approvedLimit = monthlySalary * 4;
        }

        // 4. Interest rate based on risk level
        let interestRate = 18.0; // Default
        if (riskLevel === 'LOW') interestRate = 12.5;
        if (riskLevel === 'MEDIUM') interestRate = 15.0;

        // 5. Approved term (default to requested or max 36)
        const approvedTerm = Math.min(requestedParams.termRequested, 36);

        // Cap limit
        const maxLimit = 5000000; // 5M AMD cap
        approvedLimit = Math.min(approvedLimit, maxLimit);

        return {
            approvedLimit: Math.round(approvedLimit / 1000) * 1000,
            approvedTerm,
            interestRate,
            rejected: false
        };
    }
}

module.exports = new ScoringService();
