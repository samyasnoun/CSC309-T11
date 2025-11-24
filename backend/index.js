import express from "express";
import routes from "./routes.js";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();

// Configure CORS
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));

app.use(express.json());
app.use('', routes);

export default app;