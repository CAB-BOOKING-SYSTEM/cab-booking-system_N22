const express = require('express');
const routes = require('./routes');
const internalRoutes = require('./routes/internalRoutes');
const etaRoutes = require('./routes/etaRoutes');  // THÊM DÒNG NÀY
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const app = express();

app.use(express.json());
app.use('/api/v1', routes);
app.use('/internal', internalRoutes);  // Internal APIs cho các service khác
app.use('/api/v1/eta', etaRoutes);     // THÊM DÒNG NÀY - API ETA Service

// Xử lý lỗi
app.use(notFound);
app.use(errorHandler);

module.exports = app;