#!/usr/bin/env node
'use strict';

const port = (() => {
    const args = process.argv;

    if (args.length !== 3) {
        console.error("usage: node index.js port");
        process.exit(1);
    }

    const num = parseInt(args[2], 10);
    if (isNaN(num)) {
        console.error("error: argument must be an integer.");
        process.exit(1);
    }

    return num;
})();

import express from "express";
const app = express();

app.use(express.json());

// Import routers
import authRouter from "./src/routes/auth.js";
import usersRouter from "./src/routes/users.js";
import transactionsRouter from "./src/routes/transactions.js";
import eventsRouter from "./src/routes/events.js";
import promotionsRouter from "./src/routes/promotions.js";

// Import middleware
import { authenticate, requires } from "./src/middleware/authMiddleware.js";
import { notFound, errorHandler } from "./src/middleware/errorHandler.js";

// Mount routers
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/transactions", transactionsRouter);
app.use("/events", eventsRouter);
app.use("/promotions", promotionsRouter);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

server.on('error', (err) => {
    console.error(`cannot start server: ${err.message}`);
    process.exit(1);
});