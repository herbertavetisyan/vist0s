import api from './api';

const applicationService = {
    /**
     * Submit a new loan application
     */
    submitApplication: async (data) => {
        const response = await api.post('/applications', data);
        return response.data;
    },

    /**
     * Get loan application status and offer details
     */
    getApplicationStatus: async (id) => {
        const response = await api.get(`/applications/${id}/offer`);
        return response.data;
    },

    /**
     * Select a loan offer
     */
    selectOffer: async (id, selection) => {
        const response = await api.post(`/applications/${id}/selection`, selection);
        return response.data;
    },

    /**
     * Get loan agreement PDF URL (Note: This might need token handling in browser if opened directly)
     */
    getAgreementUrl: (id) => {
        return `${api.defaults.baseURL}/applications/${id}/agreement`;
    },

    /**
     * Sign the loan agreement
     */
    signDocument: async (id) => {
        const response = await api.post(`/applications/${id}/signing`);
        return response.data;
    },

    /**
     * Request verification OTP
     */
    requestOTP: async (id) => {
        const response = await api.post(`/applications/${id}/otp-request`);
        return response.data;
    },

    /**
     * Verify OTP
     */
    verifyOTP: async (id, code) => {
        const response = await api.post(`/applications/${id}/otp-verify`, { code });
        return response.data;
    },

    /**
     * Submit final disbursement details
     */
    submitDisbursement: async (id, disbursementData) => {
        const response = await api.post(`/applications/${id}/disbursement`, disbursementData);
        return response.data;
    },

    /**
     * List all applications
     */
    listApplications: async () => {
        const response = await api.get('/applications');
        return response.data;
    },

    /**
     * Approve application (Manual Review)
     */
    approveApplication: async (id) => {
        const response = await api.post(`/applications/${id}/approve`);
        return response.data;
    },

    /**
     * Reject application
     */
    rejectApplication: async (id) => {
        const response = await api.post(`/applications/${id}/reject`);
        return response.data;
    }
};

export default applicationService;
