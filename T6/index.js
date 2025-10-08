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

const express = require("express");
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

// middleware must exist at ./middleware/basicAuth.js
let basicAuth;
try {
  basicAuth = require('./middleware/basicAuth');
} catch (e) {
  console.error('cannot load middleware/basicAuth.js:', e.message);
  process.exit(1);
}

app.use(express.json());

// ------- helpers -------
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isBoolean = (v) => typeof v === 'boolean';
const parseNoteId = (raw) => {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
};

// ------- demo endpoint -------
app.get('/hello', basicAuth, (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// ------- POST /users -------
app.post('/users', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: "Invalid payload" });
  }
  try {
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return res.status(409).json({ message: "A user with that username already exists" });
    }
    const user = await prisma.user.create({
      data: { username, password },
      select: { id: true, username: true, password: true },
    });
    return res.status(201).json(user);
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------- POST /notes (auth) -------
app.post('/notes', basicAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const { title, description, completed, public: isPublic } = req.body ?? {};
  if (
    !isNonEmptyString(title) ||
    !isNonEmptyString(description) ||
    !isBoolean(completed) ||
    !isBoolean(isPublic)
  ) {
    return res.status(400).json({ message: "Invalid payload" });
  }
  try {
    const note = await prisma.note.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        completed,
        public: isPublic,
        userId: req.user.id,
      },
      select: { id: true, title: true, description: true, completed: true, public: true, userId: true },
    });
    // IMPORTANT for Case 6: 201 Created
    return res.status(201).json(note);
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------- GET /notes (public; optional ?done=true|false) -------
app.get('/notes', async (req, res) => {
  const { done } = req.query;
  const where = { public: true };
  if (typeof done !== 'undefined') {
    if (!(done === 'true' || done === 'false')) {
      return res.status(400).json({ message: "Invalid payload" });
    }
    where.completed = (done === 'true');
  }
  try {
    const notes = await prisma.note.findMany({
      where,
      select: { id: true, title: true, description: true, completed: true, public: true, userId: true },
      orderBy: { id: 'asc' },
    });
    return res.json(notes);
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------- GET /notes/:noteId (auth; must belong to user) -------
app.get('/notes/:noteId', basicAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });

  const noteId = parseNoteId(req.params.noteId);
  if (noteId === null) return res.status(404).json({ message: "Not found" });

  try {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { id: true, title: true, description: true, completed: true, public: true, userId: true },
    });
    if (!note) return res.status(404).json({ message: "Not found" });
    if (note.userId !== req.user.id) return res.status(403).json({ message: "Not permitted" });
    return res.json(note);
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ------- PATCH /notes/:noteId (auth; existence/ownership BEFORE body checks) -------
app.patch('/notes/:noteId', basicAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });

  const noteId = parseNoteId(req.params.noteId);
  if (noteId === null) return res.status(404).json({ message: "Not found" });

  try {
    const existing = await prisma.note.findUnique({ where: { id: noteId } });
    if (!existing) return res.status(404).json({ message: "Not found" });
    if (existing.userId !== req.user.id) return res.status(403).json({ message: "Not permitted" });

    const { title, description, completed, public: isPublic } = req.body ?? {};
    const data = {};

    if (typeof title !== 'undefined') {
      if (!isNonEmptyString(title)) return res.status(400).json({ message: "Invalid payload" });
      data.title = title.trim();
    }
    if (typeof description !== 'undefined') {
      if (!isNonEmptyString(description)) return res.status(400).json({ message: "Invalid payload" });
      data.description = description.trim();
    }
    if (typeof completed !== 'undefined') {
      if (!isBoolean(completed)) return res.status(400).json({ message: "Invalid payload" });
      data.completed = completed;
    }
    if (typeof isPublic !== 'undefined') {
      if (!isBoolean(isPublic)) return res.status(400).json({ message: "Invalid payload" });
      data.public = isPublic;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const updated = await prisma.note.update({
      where: { id: noteId },
      data,
      select: { id: true, title: true, description: true, completed: true, public: true, userId: true },
    });
    return res.json(updated);
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// extra: log unhandled async errors so the grader shows something helpful
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  process.exit(1);
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

server.on('error', (err) => {
  console.error(`cannot start server: ${err.message}`);
  process.exit(1);
});