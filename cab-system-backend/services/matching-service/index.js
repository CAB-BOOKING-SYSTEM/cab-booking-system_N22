require('dotenv').config();

// Import app từ src/app.js
const app = require('./src/app');

const PORT = process.env.PORT || 3010;

// App đã được start trong app.js, không cần start lại
console.log(`🎯 Matching Service configuration loaded`);
console.log(`   Service will run on port ${PORT}`);

module.exports = app;