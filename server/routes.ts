import type { Express } from "express";
import type { Server } from "http";
import dossierRouter from "./routes/dossier";
import chaptersRouter from "./routes/chapters";
import booksRouter from "./routes/books";
import editorRouter from "./routes/editor";
import publishingRouter from "./routes/publishing";
import pipelinesRouter from "./routes/pipelines";
import toolsRouter from "./routes/tools";
import { registerJobRoutes } from "./jobs";

// Domain routers keep their full "/api/..." paths internally, so mounting at
// root preserves every client-visible URL. Mount order mirrors the original
// monolithic registration order (dossier → chapters → books → editor →
// publishing → pipelines → tools) so route-matching precedence is unchanged.
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(dossierRouter);
  app.use(chaptersRouter);
  app.use(booksRouter);
  app.use(editorRouter);
  app.use(publishingRouter);
  app.use(pipelinesRouter);
  app.use(toolsRouter);
  registerJobRoutes(app);

  return httpServer;
}
