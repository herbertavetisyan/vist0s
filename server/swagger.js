const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'VistLos API',
            version: '1.0.0',
            description: 'Loan Origination System API with Enrichment Services',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            schemas: {
                EnrichmentRequest: {
                    type: 'object',
                    required: ['nationalId', 'phone', 'email'],
                    properties: {
                        nationalId: {
                            type: 'string',
                            description: 'National ID or Passport number',
                            example: 'AB1234567'
                        },
                        phone: {
                            type: 'string',
                            description: 'Phone number',
                            example: '+374XXXXXXXX'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Email address',
                            example: 'applicant@example.com'
                        }
                    }
                },
                EnrichmentResponse: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Enrichment request created and processing started'
                        },
                        enrichmentRequestId: {
                            type: 'integer',
                            example: 1
                        },
                        status: {
                            type: 'string',
                            enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL'],
                            example: 'PENDING'
                        },
                        pollUrl: {
                            type: 'string',
                            example: '/api/enrichment/1'
                        }
                    }
                },
                EnrichmentStatus: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1
                        },
                        nationalId: {
                            type: 'string',
                            example: 'AB1234567'
                        },
                        phone: {
                            type: 'string',
                            example: '+374XXXXXXXX'
                        },
                        email: {
                            type: 'string',
                            example: 'test@example.com'
                        },
                        status: {
                            type: 'string',
                            enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL']
                        },
                        progress: {
                            type: 'integer',
                            description: 'Completion percentage (0-100)',
                            example: 75
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        results: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/ServiceResult'
                            }
                        }
                    }
                },
                ServiceResult: {
                    type: 'object',
                    properties: {
                        serviceName: {
                            type: 'string',
                            enum: ['norq', 'ekeng', 'acra', 'dms'],
                            example: 'norq'
                        },
                        status: {
                            type: 'string',
                            enum: ['success', 'failed', 'timeout'],
                            example: 'success'
                        },
                        sequenceOrder: {
                            type: 'integer',
                            description: '1=norq, 2=ekeng, 3=acra, 4=dms',
                            example: 1
                        },
                        requestedAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        respondedAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        responseData: {
                            type: 'object',
                            description: 'Service-specific response data'
                        },
                        errorMessage: {
                            type: 'string',
                            nullable: true
                        },
                        responseTime: {
                            type: 'integer',
                            description: 'Response time in milliseconds',
                            example: 1250
                        }
                    }
                }
            }
        }
    },
    apis: ['./routes/*.js'], // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = { specs, swaggerUi };
