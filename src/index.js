import express from "express";
import "dotenv/config";
import job from "./lib/cron.js";

import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";

import {connectDB} from "./lib/db.js";


const app = express();
const port = process.env.PORT ;

job.start();
app.use(express.json({ limit: '10mb' })); // Increase from default 100kb to 10MB

app.use("/api/auth",authRoutes);
app.use("/api/books",bookRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  connectDB();
});