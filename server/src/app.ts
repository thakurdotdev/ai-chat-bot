import cors from "cors";
import express from "express";
import { errorMiddleware } from "./middleware/error.middleware";
import chatRoutes from "./routes/chat.routes";
import { env } from "./config/env";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.FRONTEND_URL }));
  app.use(express.json({ limit: "50kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "Welcome to the AI Chat Bot" });
  });

  app.use("/chat", chatRoutes);

  app.use(errorMiddleware);

  return app;
}
