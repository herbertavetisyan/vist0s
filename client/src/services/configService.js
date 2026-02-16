import api from './api';

export const getStages = async () => {
    const response = await api.get('/config/stages');
    return response.data;
};

export const createProduct = async (productData) => {
    const response = await api.post('/config/products', productData);
    return response.data;
};
