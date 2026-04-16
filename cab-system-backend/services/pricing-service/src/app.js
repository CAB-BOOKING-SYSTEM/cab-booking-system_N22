const express = require('express');
const routes = require('./routes');
const internalRoutes = require('./routes/internalRoutes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const app = express();

app.use(express.json());
app.use('/api/v1', routes);
app.use('/internal', internalRoutes);  // Internal APIs cho các service khác

// Xử lý lỗi
app.use(notFound);
app.use(errorHandler);

module.exports = app;