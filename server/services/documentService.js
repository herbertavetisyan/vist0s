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
        console.log(`[Document Service] 📄 Generating ${docType} for Application #${application.id}...`);

        // In a real application, we'd use 'pdfkit' or 'puppeteer'
        // For now, we return a mock string as buffer
        const content = `
            LOAN AGREEMENT - ${docType.toUpperCase()}
            Application ID: ${application.id}
            Amount: ${application.selectedAmount} ${application.currency}
            Term: ${application.selectedTerm} months
            Interest Rate: ${application.interestRate}%
            
            This is a legally binding document generated for digital signing.
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
