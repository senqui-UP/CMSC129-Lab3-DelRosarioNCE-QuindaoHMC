import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";
import storiesRouter from "./routes/stories";
import librariesRouter from "./routes/libraries";
import authRouter from "./routes/auth";
import aiChatRouter from "./routes/aiChat";
import aiDataRouter from "./routes/aiData";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/api/v1/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/stories", storiesRouter);
app.use("/api/v1/libraries", librariesRouter);
app.use("/api/v1/ai", aiChatRouter);
app.use("/api/v1/ai-data", aiDataRouter);

app.use(errorHandler);

const port = env.PORT;

console.log(`Starting server on port ${port}...`);

connectDB()
  .then(() => app.listen(port, () => console.log(`Server running on ${port}`)))
  .catch((err) => {
    console.error("DB connect failed", err);
    process.exit(1);
  });
