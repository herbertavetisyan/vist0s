import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'VistOS API',
            version: '1.0.0',
            description: 'API documentation for the VistOS Loan Origination Platform backend',
        },
        servers: [
            {
                url: '/api',
                description: 'Relative (works on any host)',
            },
            {
                url: 'https://os.vist.am/api',
                description: 'Production Server',
            },
            {
                url: 'http://localhost:5000/api',
                description: 'Local Development',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
                apiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-api-key',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
            {
                apiKeyAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
