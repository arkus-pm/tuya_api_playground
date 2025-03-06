import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://openapi.tuyaeu.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            // Copy authentication headers
            const { t, sign, client_id, sign_method } = req.headers;
            if (t) proxyReq.setHeader("t", t);
            if (sign) proxyReq.setHeader("sign", sign);
            if (client_id) proxyReq.setHeader("client_id", client_id);
            if (sign_method) proxyReq.setHeader("sign_method", sign_method);

            console.log("Sending Request to Tuya:", req.method, req.url);
            console.log("With headers:", proxyReq.getHeaders());
          });
          proxy.on("proxyRes", (proxyRes, req, res) => {
            // Add CORS headers to the response
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader(
              "Access-Control-Allow-Methods",
              "GET, POST, PUT, DELETE, OPTIONS"
            );
            res.setHeader(
              "Access-Control-Allow-Headers",
              "Content-Type, t, sign, client_id, sign_method"
            );
            res.setHeader("Access-Control-Max-Age", "86400");

            // Handle OPTIONS requests
            if (req.method === "OPTIONS") {
              res.statusCode = 200;
              res.end();
              return;
            }
          });
        },
      },
    },
  },
});
