import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";

export const corsMiddleware = cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "t", "sign", "client_id", "sign_method"],
  credentials: true,
});

export const proxyMiddleware = createProxyMiddleware({
  target: "https://openapi.tuyaeu.com",
  changeOrigin: true,
  pathRewrite: {
    "^/api": "",
  },
  onProxyReq: (proxyReq, req, res) => {
    // Copy authentication headers
    if (req.headers.t) proxyReq.setHeader("t", req.headers.t);
    if (req.headers.sign) proxyReq.setHeader("sign", req.headers.sign);
    if (req.headers.client_id)
      proxyReq.setHeader("client_id", req.headers.client_id);
    if (req.headers.sign_method)
      proxyReq.setHeader("sign_method", req.headers.sign_method);
  },
});
