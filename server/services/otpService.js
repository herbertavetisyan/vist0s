/**
 * OTP Service
 * Handles generation, delivery (mock), and verification of One-Time Passwords.
 */
const crypto = require('crypto');

class OTPService {
    /**
     * Generate a 6-digit OTP and its expiry
     * @returns {object} { code, hash, expiresAt }
     */
    generateOTP() {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

        // In a real app, we'd hash this with a secret
        const hash = crypto.createHash('sha256').update(code).digest('hex');

        return { code, hash, expiresAt };
    }

    /**
     * Send OTP via SMS (Mock)
     * @param {string} phoneNumber 
     * @param {string} code 
     */
    async sendSMS(phoneNumber, code) {
        console.log(`[OTP Service] 📱 Sending SMS to ${phoneNumber}: Your loan verification code is ${code}`);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
    }

    /**
     * Verify provided code against stored hash
     * @param {string} code 
     * @param {string} storedHash 
     * @param {Date} expiresAt 
     * @returns {boolean}
     */
    verifyOTP(code, storedHash, expiresAt) {
        if (new Date() > expiresAt) {
            console.log('[OTP Service] OTP has expired');
            return false;
        }

        const inputHash = crypto.createHash('sha256').update(code).digest('hex');
        return inputHash === storedHash;
    }
}

module.exports = new OTPService();
