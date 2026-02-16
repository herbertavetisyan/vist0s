import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const applicationService = {
    /**
     * Submit a new loan application
     */
    submitApplication: async (data) => {
        const response = await axios.post(`${API_URL}/applications`, data);
        return response.data;
    },

    /**
     * Get loan application status and offer details
     */
    getApplicationStatus: async (id) => {
        const response = await axios.get(`${API_URL}/applications/${id}/offer`);
        return response.data;
    },

    /**
     * Select a loan offer
     */
    selectOffer: async (id, selection) => {
        const response = await axios.post(`${API_URL}/applications/${id}/selection`, selection);
        return response.data;
    },

    /**
     * Get loan agreement PDF URL
     */
    getAgreementUrl: (id) => {
        return `${API_URL}/applications/${id}/agreement`;
    },

    /**
     * Sign the loan agreement
     */
    signDocument: async (id) => {
        const response = await axios.post(`${API_URL}/applications/${id}/signing`);
        return response.data;
    },

    /**
     * Request verification OTP
     */
    requestOTP: async (id) => {
        const response = await axios.post(`${API_URL}/applications/${id}/otp-request`);
        return response.data;
    },

    /**
     * Verify OTP
     */
    verifyOTP: async (id, code) => {
        const response = await axios.post(`${API_URL}/applications/${id}/otp-verify`, { code });
        return response.data;
    },

    /**
     * Submit final disbursement details
     */
    submitDisbursement: async (id, disbursementData) => {
        const response = await axios.post(`${API_URL}/applications/${id}/disbursement`, disbursementData);
        return response.data;
    },

    /**
     * Approve application (Manual Review)
     */
    approveApplication: async (id) => {
        const response = await axios.post(`${API_URL}/applications/${id}/approve`);
        return response.data;
    },

    /**
     * Reject application
     */
    rejectApplication: async (id) => {
        const response = await axios.post(`${API_URL}/applications/${id}/reject`);
        return response.data;
    }
};

export default applicationService;
