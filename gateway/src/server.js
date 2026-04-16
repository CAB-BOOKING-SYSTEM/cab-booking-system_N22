require("dotenv").config(); // [cite: 352]
const app = require("./app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT}`);
});
