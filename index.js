// index.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import swaggerJsdoc from "swagger-jsdoc";
import http from "http";
import os from "os";
import { fileURLToPath } from "url";

import routes from "./src/routes/index.routes.js";
import { notFound, errorHandler } from "./src/middlewares/error-handler.js";
import { swaggerOptions } from "./src/config/swagger.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);

/* ============================
   Core middleware
   ============================ */
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // dev/prod safe
  })
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));

// Static (optional)
app.use(express.static(path.join(process.cwd(), "public")));

// Quiet favicon console noise
app.get("/favicon.ico", (_req, res) => res.status(204).end());

/* ============================
   Swagger Docs
   ============================ */
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Raw spec (handy for debugging)
app.get("/swagger.json", (_req, res) => {
  res.type("application/json").status(200).send(swaggerSpec);
});

// CSP for the Swagger page (allows self + CDN assets)
const swaggerCsp = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "https://unpkg.com",
      "https://cdn.jsdelivr.net",
      "'unsafe-inline'",
    ],
    styleSrc: [
      "'self'",
      "https://unpkg.com",
      "https://cdn.jsdelivr.net",
      "'unsafe-inline'",
    ],
    imgSrc: [
      "'self'",
      "data:",
      "https://unpkg.com",
      "https://cdn.jsdelivr.net",
    ],
    mediaSrc: ["'self'", "blob:", "data:"], // <-- allow audio blob URLs
    connectSrc: ["'self'", "https://unpkg.com", "https://cdn.jsdelivr.net"], // API calls are same-origin => 'self'
    workerSrc: ["'self'", "blob:"],
    frameAncestors: ["'self'"],
  },
});

// Serve Swagger UI — spec is inlined; server URL matches page origin (http or https)
app.get("/swagger", swaggerCsp, (_req, res) => {
  const specJson = JSON.stringify(swaggerSpec);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>JuanMap API Docs</title>
  <!-- No meta CSP; we use Helmet header (swaggerCsp) so frame-ancestors isn't ignored -->
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>html,body{height:100%}body{margin:0;background:#fff}#swagger-ui{min-height:100vh}</style>
</head>
<body>
  <div id="swagger-ui"></div>

  <script>
    (function () {
      var spec = ${specJson};
      var origin = window.location.origin;
      spec.servers = [{ url: origin, description: 'This Origin' }, { url: '/', description: 'Relative' }];
      window.__SWAGGER_SPEC__ = spec;
    })();
  </script>

  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    // A tiny helper that renders an <audio> player for a Blob
    function renderAudioPlayerForLastResponse(blob) {
      var url = URL.createObjectURL(blob);
      var audioHtml = '<div style="margin:12px 0"><audio controls style="width:100%"><source src="' + url + '" type="audio/mpeg"></audio></div>';

      // Try to mount near the last response block
      var respBlocks = document.querySelectorAll('.opblock .responses-wrapper, .responses-inner, [data-section-id="response-body"]');
      var mount = respBlocks[respBlocks.length - 1] || document.getElementById('swagger-ui');
      if (mount && !mount.querySelector('audio')) {
        var holder = document.createElement('div');
        holder.innerHTML = audioHtml;
        mount.prepend(holder);
      }
    }

    // Store the last request payload for /api/tts so we can re-fetch as blob if Swagger didn't
    window.__LAST_TTS_REQ__ = null;

    window.onload = function () {
      window.ui = SwaggerUIBundle({
        spec: window.__SWAGGER_SPEC__,
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'BaseLayout',
        deepLinking: true,

        // 1) Save the outgoing request so we can replay it as blob if needed
        requestInterceptor: function (req) {
          try {
            var re = new RegExp("\\\\/api\\\\/tts(?:\\\\b|$)");
            if (re.test(req.url)) {
              req.headers = req.headers || {};
              req.headers['Accept'] = 'audio/mpeg';
              // swagger-client may ignore responseType; we replay in responseInterceptor if needed.
              window.__LAST_TTS_REQ__ = {
                url: req.url,
                method: (req.method || 'POST').toUpperCase(),
                headers: req.headers,
                body: (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}))
              };
            }
          } catch (e) {}
          return req;
        },

        // 2) If response is audio/mpeg but Swagger didn't give a Blob, re-fetch as blob() and render <audio>
        responseInterceptor: async function (res) {
          try {
            var ct = String((res.headers && (res.headers['content-type'] || res.headers['Content-Type'])) || '').toLowerCase();
            if (ct.indexOf('audio/mpeg') !== -1) {
              // If Swagger already produced a Blob, we're good
              if (res.data instanceof Blob) {
                renderAudioPlayerForLastResponse(res.data);
                return res;
              }
              // Otherwise, re-fetch the same call as a real Blob and render it
              var info = window.__LAST_TTS_REQ__;
              if (info) {
                var hdrs = new Headers(info.headers || {});
                hdrs.set('Accept', 'audio/mpeg');
                // Ensure JSON content-type for POST
                if (info.method === 'POST' && !hdrs.has('Content-Type')) {
                  hdrs.set('Content-Type', 'application/json');
                }
                var r = await fetch(info.url, {
                  method: info.method,
                  headers: hdrs,
                  body: info.method === 'POST' ? info.body : undefined,
                  credentials: 'include',
                });
                var blob = await r.blob(); // <-- guaranteed Blob
                renderAudioPlayerForLastResponse(blob);

                // Hand a Blob back to Swagger so its own preview (if any) also works
                res.data = blob;
              }
            }
          } catch (e) {
            // swallow—this is just a Swagger preview helper
          }
          return res;
        },
      });
    };
  </script>
</body>
</html>`;
  res.type("text/html; charset=utf-8").status(200).send(html);
});


/* ===== Health ===== */
app.get("/health", (_req, res) => {
  res.json({ success: true, status: "OK" });
});

/* ===== API routes ===== */
app.use("/api", routes);

/* ===== 404 + error handlers ===== */
app.use(notFound);
app.use(errorHandler);

/* ============================
   Export app for serverless / tests
   ============================ */
export default app;

/* ============================
   Local bootstrap (only when run directly and not on Vercel)
   ============================ */
const isVercel = !!process.env.VERCEL;
const isMainModule = (() => {
  // Detect "node index.js" for ESM
  const thisFile = fileURLToPath(import.meta.url);
  return process.argv[1] === thisFile;
})();

if (!isVercel && isMainModule) {
  const PORT = Number(process.env.PORT) || 3000;
  http.createServer(app).listen(PORT, () => {
    const nets = os.networkInterfaces();
    const addrs = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          addrs.push(`http://${net.address}:${PORT}`);
        }
      }
    }
    const local = `http://localhost:${PORT}`;
    const lines = [
      "",
      "HTTP server listening:",
      `  • Local:   ${local}`,
      ...(addrs.length ? [`  • Network: ${addrs.join(", ")}`] : []),
      "Swagger UI:",
      `  • ${local}/swagger`,
      ...(addrs.length ? addrs.map((a) => `  • ${a}/swagger`) : []),
      "",
    ];
    console.log(lines.join("\n"));
  });
}
