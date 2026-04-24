const fs = require("fs");
const http = require("http");
const https = require("https");

const isEnabled = () => {
  const value = String(process.env.MTLS_ENABLED || "").toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
};

const getProtocol = () => (isEnabled() ? "https" : "http");

const readTlsMaterial = () => {
  if (!isEnabled()) {
    return null;
  }

  const { TLS_CA_PATH, TLS_CERT_PATH, TLS_KEY_PATH } = process.env;
  if (!TLS_CA_PATH || !TLS_CERT_PATH || !TLS_KEY_PATH) {
    return null;
  }

  if (
    !fs.existsSync(TLS_CA_PATH) ||
    !fs.existsSync(TLS_CERT_PATH) ||
    !fs.existsSync(TLS_KEY_PATH)
  ) {
    return null;
  }

  try {
    return {
      ca: fs.readFileSync(TLS_CA_PATH),
      cert: fs.readFileSync(TLS_CERT_PATH),
      key: fs.readFileSync(TLS_KEY_PATH),
    };
  } catch (err) {
    console.error("Failed to read TLS material:", err.message);
    return null;
  }
};

const createServer = (app, options = {}) => {
  const tlsMaterial = readTlsMaterial();
  const { requestCert = true, rejectUnauthorized = true } = options;

  if (!tlsMaterial) {
    if (isEnabled()) {
      throw new Error(
        "MTLS_ENABLED is on, but TLS material is missing or unreadable. Check your certificate paths and permissions.",
      );
    }

    return http.createServer(app);
  }

  return https.createServer(
    {
      ...tlsMaterial,
      requestCert: requestCert,
      rejectUnauthorized: rejectUnauthorized,
      minVersion: "TLSv1.2",
    },
    app,
  );
};

const createClientAgent = () => {
  const tlsMaterial = readTlsMaterial();

  if (!tlsMaterial) {
    return undefined;
  }

  return new https.Agent({
    ...tlsMaterial,
    rejectUnauthorized: true,
    minVersion: "TLSv1.2",
  });
};

module.exports = {
  createClientAgent,
  createServer,
  isEnabled,
  getProtocol,
};
