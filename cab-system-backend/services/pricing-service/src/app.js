const express = require('express');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const app = express();

app.use(express.json());
app.use('/api/v1', routes);

// Xử lý lỗi
app.use(notFound);
app.use(errorHandler);

module.exports = app;