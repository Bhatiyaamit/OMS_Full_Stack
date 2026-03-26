const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "OMS API",
      version: "1.0.0",
      description: "Order Management System APIs",
    },
    servers: [
      {
        url: "http://localhost:5011",
      },
    ],
  },
  apis: ["./routes/*.js"], // where your routes are
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
