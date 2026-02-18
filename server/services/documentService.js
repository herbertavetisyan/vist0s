/**
 * Document Service
 * Handles generation and retrieval of loan agreements (PDF).
 */

class DocumentService {
    /**
     * Generate a loan agreement PDF (Mock)
     * @param {object} application - Loan Application record
     * @param {string} docType - 'agreement-1' or 'agreement-2'
     * @returns {Promise<Buffer>} Mock PDF buffer
     */
    async generateAgreement(application, docType) {
        const docName = docType === 'payment-schedule' ? 'PAYMENT SCHEDULE' : 'LOAN AGREEMENT';
        console.log(`[Document Service] 📄 Generating ${docName} for Application #${application.id}...`);

        const content = `
            ${docName}
            Application ID: ${application.id}
            Amount: ${application.selectedAmount} ${application.currency}
            Term: ${application.selectedTerm} months
            Interest Rate: ${application.interestRate}%
            
            This is one of the 2 legal contracts (Loan Agreement & Payment Schedule) 
            required for the Personal Loan process.
            Generated for digital signing.
            Timestamp: ${new Date().toISOString()}
        `;

        return Buffer.from(content);
    }

    /**
     * Mock signing process
     * @param {number} applicationId 
     * @param {string} docType 
     */
    async signDocument(applicationId, docType) {
        console.log(`[Document Service] ✅ Document ${docType} signed for Application #${applicationId}`);
        return true;
    }
}

module.exports = new DocumentService();
