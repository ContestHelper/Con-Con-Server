const swaggerUi = require('swagger-ui-express');
const swaggereJsdoc = require('swagger-jsdoc');

const options = {
    swaggerDefinition: {
        // openapi: "3.0.0",
        info: {
            title: 'Contest-Connection API',
            version: '1.0.0',
            description: 'Test API with express',
        },
        host: 'ec2-18-191-238-179.us-east-2.compute.amazonaws.com:3000',
        basePath: '/',
        
    },
    apis: ['./routes/*.js', './swagger/*'],
};

const specs = swaggereJsdoc(options);

module.exports = {
    swaggerUi,
    specs
};