require("dotenv").config(); // [cite: 352]
const app = require("./app");
const mtls = require("/shared/mtls.cjs");

const PORT = process.env.PORT || 3000;
// Gateway does NOT require client certificates from browsers
const server = mtls.createServer(app, { requestCert: false, rejectUnauthorized: false });
const protocol = mtls.getProtocol();

server.listen(PORT, () => {
  console.log(`API Gateway is running on ${protocol}://localhost:${PORT}`);
});
