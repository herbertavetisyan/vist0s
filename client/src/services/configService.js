const API_URL = 'http://localhost:3000/api/config';

export const getStages = async () => {
    const response = await fetch(`${API_URL}/stages`);
    if (!response.ok) {
        throw new Error('Failed to fetch stages');
    }
    return response.json();
};

export const createProduct = async (productData) => {
    const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create product');
    }

    return response.json();
};
