import cors from "cors";
import express, { Request, Response } from "express";
import { env } from "./config/env";
import { errorMiddleware } from "./middleware/error.middleware";
import chatRoutes from "./routes/chat.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.FRONTEND_URL }));
  app.use(express.json({ limit: "50kb" }));

  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "Welcome to the AI Chat Bot" });
  });

  app.use("/chat", chatRoutes);

  app.use(errorMiddleware);

  return app;
}
