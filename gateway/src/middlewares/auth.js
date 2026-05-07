const http = require("http");
const https = require("https");
const { URL } = require("url");
const mtls = require("/shared/mtls.cjs");

const gatewayAgent = mtls.createClientAgent();
const useMtls = Boolean(gatewayAgent);
const authServiceHost = process.env.AUTH_SERVICE_HOST || "auth-service";
const authServicePort = process.env.AUTH_SERVICE_PORT || 3001;
const authProfilePath = "/api/auth/profile";
const authServiceUrl = `${useMtls ? "https" : "http"}://${authServiceHost}:${authServicePort}${authProfilePath}`;

const verifyTokenWithAuthService = (authHeader) => {
  return new Promise((resolve, reject) => {
    const url = new URL(authServiceUrl);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
      agent: gatewayAgent || undefined,
    };

    if (useMtls) {
      opts.rejectUnauthorized = true;
    }

    const transport = useMtls ? https : http;
    const req = transport.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        let body = {};
        if (data) {
          try {
            body = JSON.parse(data);
          } catch (err) {
            return reject(new Error("Invalid response from auth service"));
          }
        }

        if (res.statusCode === 200) {
          return resolve(body.user);
        }

        const error = new Error(body.message || "Authentication failed");
        error.statusCode = res.statusCode;
        error.body = body;
        return reject(error);
      });
    });

    req.on("error", reject);
    req.end();
  });
};

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      code: "TOKEN_MISSING",
      message: "Unauthorized: No token provided",
    });
  }

  try {
    const user = await verifyTokenWithAuthService(authHeader);
    req.user = user;
    next();
  } catch (error) {
    if (error.statusCode === 401) {
      return res.status(401).json({
        code: "TOKEN_INVALID",
        message: error.body?.message || "Unauthorized: Invalid token",
      });
    }

    console.error("Auth service error:", error);
    return res.status(502).json({
      code: "AUTH_SERVICE_UNAVAILABLE",
      message: "Authentication service unavailable",
    });
  }
};
