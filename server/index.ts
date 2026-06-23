import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import forgeRouter from "./forge/routes";
import universeRouter from "./universeRoutes";
import { seedDemoProject } from "./forge/seed/seed-demo";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && !path.startsWith("/api/chapter")) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  app.use("/api/forge", forgeRouter);
  app.use("/api/universe", universeRouter);
  app.use("/api/outline", (await import("./outlineRoutes")).default);
  app.use("/api/tropes", (await import("./tropes/tropeRoutes")).default);
  app.use("/api/dimensions", (await import("./dimensions/dimensionRoutes")).default);
  app.use("/api/expand", (await import("./expandRoutes")).default);
  await registerRoutes(httpServer, app);
  
  seedDemoProject().catch(err => console.log("[FORGE] Seed skipped or failed:", err.message));

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      // reusePort removed — it was masking orphaned process collisions
    },
    () => {
      log(`serving on port ${port}`);
    },
  );

  // Graceful shutdown — close the HTTP server cleanly so the port
  // is released before the process exits. Without this, tsx/node
  // process trees get orphaned and keep holding port 5000.
  const shutdown = (signal: string) => {
    log(`${signal} received — shutting down gracefully`);
    httpServer.close(() => {
      log("HTTP server closed");
      process.exit(0);
    });

    // Force exit after 5 seconds if connections don't drain
    setTimeout(() => {
      log("Forced exit after timeout");
      process.exit(1);
    }, 5000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));

  // Catch unhandled errors so the process doesn't silently zombie
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    shutdown("uncaughtException");
  });
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
  });
})();
