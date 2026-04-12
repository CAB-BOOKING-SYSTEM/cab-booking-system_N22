require('dotenv').config();

// Import app từ src/app.js
const app = require('./src/app');

const PORT = process.env.PORT || 3010;

app.listen(PORT, () => {
  console.log(`🎯 Matching Service running on port ${PORT}`);
});