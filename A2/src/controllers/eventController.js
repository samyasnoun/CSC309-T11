import prisma from "../prismaClient.js";

// POST /events - Create a new event
export const postEvent = async (req, res) => {
  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!isManagerOrHigher) throw new Error("Forbidden");

  const { name, description, location, startTime, endTime, capacity, points } = req.body;

  if (!name || typeof name !== "string" || name.length === 0) {
    throw new Error("Bad Request");
  }

  if (!description || typeof description !== "string") {
    throw new Error("Bad Request");
  }

  if (!location || typeof location !== "string") {
    throw new Error("Bad Request");
  }

  if (!startTime || !endTime) {
    throw new Error("Bad Request");
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Bad Request");
  }

  if (start >= end) {
    throw new Error("Bad Request");
  }

  if (capacity !== undefined && capacity !== null) {
    if (!Number.isInteger(capacity) || capacity < 0) {
      throw new Error("Bad Request");
    }
  }

  if (!Number.isInteger(points) || points < 0) {
    throw new Error("Bad Request");
  }

  const event = await prisma.event.create({
    data: {
      name,
      description,
      location,
      startTime: start,
      endTime: end,
      capacity: capacity || null,
      points,
      pointsRemain: points,
      createdById: me.id,
      published: false,
    },
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      startTime: true,
      endTime: true,
      capacity: true,
      points: true,
      pointsRemain: true,
      pointsAwarded: true,
      published: true,
      createdById: true,
    },
  });

  return res.status(201).json(event);
};

// GET /events - Retrieve a list of events
export const getEvents = async (req, res) => {
  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const { name, published, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

  const where = {};

  if (name) {
    where.name = { contains: String(name), mode: "insensitive" };
  }

  if (published !== undefined) {
    if (published === "true") where.published = true;
    else if (published === "false") where.published = false;
  }

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!isManagerOrHigher) {
    where.published = true;
  }

  const count = await prisma.event.count({ where });

  const results = await prisma.event.findMany({
    where,
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      startTime: true,
      endTime: true,
      capacity: true,
      points: true,
      pointsRemain: true,
      pointsAwarded: true,
      published: true,
      createdById: true,
    },
  });

  return res.status(200).json({ count, results });
};

// GET /events/:eventId - Retrieve a single event by ID
export const getEventById = async (req, res) => {
  const id = Number(req.params.eventId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      startTime: true,
      endTime: true,
      capacity: true,
      points: true,
      pointsRemain: true,
      pointsAwarded: true,
      published: true,
      createdById: true,
      organizers: {
        select: {
          id: true,
          utorid: true,
          name: true,
        },
        orderBy: { id: "asc" },
      },
      guests: {
        select: {
          id: true,
          utorid: true,
          name: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!event) throw new Error("Not Found");

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!event.published && !isManagerOrHigher) {
    throw new Error("Forbidden");
  }

  return res.status(200).json(event);
};

// PATCH /events/:eventId - Update an event
export const patchEventById = async (req, res) => {
  const id = Number(req.params.eventId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!isManagerOrHigher) throw new Error("Forbidden");

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new Error("Not Found");

  const { name, description, location, startTime, endTime, capacity, points, published } = req.body;

  const updates = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.length === 0) {
      throw new Error("Bad Request");
    }
    updates.name = name;
  }

  if (description !== undefined) {
    if (typeof description !== "string") {
      throw new Error("Bad Request");
    }
    updates.description = description;
  }

  if (location !== undefined) {
    if (typeof location !== "string") {
      throw new Error("Bad Request");
    }
    updates.location = location;
  }

  if (startTime !== undefined) {
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      throw new Error("Bad Request");
    }
    updates.startTime = start;
  }

  if (endTime !== undefined) {
    const end = new Date(endTime);
    if (isNaN(end.getTime())) {
      throw new Error("Bad Request");
    }
    updates.endTime = end;
  }

  if (updates.startTime || updates.endTime) {
    const finalStart = updates.startTime || event.startTime;
    const finalEnd = updates.endTime || event.endTime;
    if (finalStart >= finalEnd) {
      throw new Error("Bad Request");
    }
  }

  if (capacity !== undefined) {
    if (capacity === null) {
      updates.capacity = null;
    } else if (!Number.isInteger(capacity) || capacity < 0) {
      throw new Error("Bad Request");
    } else {
      updates.capacity = capacity;
    }
  }

  if (points !== undefined) {
    if (!Number.isInteger(points) || points < 0) {
      throw new Error("Bad Request");
    }
    const pointsDiff = points - event.points;
    updates.points = points;
    updates.pointsRemain = event.pointsRemain + pointsDiff;
  }

  if (published !== undefined) {
    if (typeof published !== "boolean") {
      throw new Error("Bad Request");
    }
    updates.published = published;
  }

  const updatedEvent = await prisma.event.update({
    where: { id },
    data: updates,
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      startTime: true,
      endTime: true,
      capacity: true,
      points: true,
      pointsRemain: true,
      pointsAwarded: true,
      published: true,
      createdById: true,
    },
  });

  return res.status(200).json(updatedEvent);
};

// DELETE /events/:eventId - Delete an event
export const deleteEventById = async (req, res) => {
  const id = Number(req.params.eventId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!isManagerOrHigher) throw new Error("Forbidden");

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new Error("Not Found");

  await prisma.event.delete({ where: { id } });

  return res.status(200).json({ message: "Event deleted successfully" });
};

// POST /events/:eventId/organizers - Add an organizer to an event
export const postOrganizerToEvent = async (req, res) => {
  const eventId = Number(req.params.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!isManagerOrHigher) throw new Error("Forbidden");

  const { userId } = req.body;

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Bad Request");
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Not Found");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Not Found");

  await prisma.event.update({
    where: { id: eventId },
    data: {
      organizers: { connect: { id: userId } },
    },
  });

  return res.status(201).json({ message: "Organizer added successfully" });
};

// DELETE /events/:eventId/organizers/:userId - Remove an organizer from an event
export const removeOrganizerFromEvent = async (req, res) => {
  const eventId = Number(req.params.eventId);
  const userId = Number(req.params.userId);

  if (!Number.isInteger(eventId) || eventId <= 0 || !Number.isInteger(userId) || userId <= 0) {
    throw new Error("Bad Request");
  }

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!isManagerOrHigher) throw new Error("Forbidden");

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Not Found");

  await prisma.event.update({
    where: { id: eventId },
    data: {
      organizers: { disconnect: { id: userId } },
    },
  });

  return res.status(200).json({ message: "Organizer removed successfully" });
};

// POST /events/:eventId/guests - Add a guest to an event
export const postGuestToEvent = async (req, res) => {
  const eventId = Number(req.params.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!isManagerOrHigher) throw new Error("Forbidden");

  const { userId } = req.body;

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Bad Request");
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { guests: true },
  });
  if (!event) throw new Error("Not Found");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Not Found");

  if (event.capacity !== null && event.guests.length >= event.capacity) {
    throw new Error("Bad Request");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      guests: { connect: { id: userId } },
    },
  });

  return res.status(201).json({ message: "Guest added successfully" });
};

// DELETE /events/:eventId/guests/:userId - Remove a guest from an event
export const deleteGuestFromEvent = async (req, res) => {
  const eventId = Number(req.params.eventId);
  const userId = Number(req.params.userId);

  if (!Number.isInteger(eventId) || eventId <= 0 || !Number.isInteger(userId) || userId <= 0) {
    throw new Error("Bad Request");
  }

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!isManagerOrHigher) throw new Error("Forbidden");

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Not Found");

  await prisma.event.update({
    where: { id: eventId },
    data: {
      guests: { disconnect: { id: userId } },
    },
  });

  return res.status(200).json({ message: "Guest removed successfully" });
};

// POST /events/:eventId/guests/me - Add current user as guest
export const postCurrentUserToEvent = async (req, res) => {
  const eventId = Number(req.params.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { guests: true },
  });
  if (!event) throw new Error("Not Found");

  if (!event.published) {
    throw new Error("Forbidden");
  }

  if (event.capacity !== null && event.guests.length >= event.capacity) {
    throw new Error("Bad Request");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      guests: { connect: { id: me.id } },
    },
  });

  return res.status(201).json({ message: "Successfully registered for event" });
};

// DELETE /events/:eventId/guests/me - Remove current user from guests
export const removeCurrentUserFromEvent = async (req, res) => {
  const eventId = Number(req.params.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Not Found");

  await prisma.event.update({
    where: { id: eventId },
    data: {
      guests: { disconnect: { id: me.id } },
    },
  });

  return res.status(200).json({ message: "Successfully unregistered from event" });
};

// POST /events/:eventId/transactions - Create reward transaction for event
export const createRewardTransaction = async (req, res) => {
  const eventId = Number(req.params.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { organizers: true, guests: true },
  });

  if (!event) throw new Error("Not Found");

  const isOrganizer = event.organizers.some((org) => org.id === me.id);
  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);

  if (!isOrganizer && !isManagerOrHigher) {
    throw new Error("Forbidden");
  }

  const { userId, points } = req.body;

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Bad Request");
  }

  if (!Number.isInteger(points) || points <= 0) {
    throw new Error("Bad Request");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Not Found");

  const isGuest = event.guests.some((guest) => guest.id === userId);
  if (!isGuest) {
    throw new Error("Forbidden");
  }

  if (event.pointsRemain < points) {
    throw new Error("Bad Request");
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type: "event",
      amount: points,
      eventId,
      createdById: me.id,
    },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      eventId: true,
      createdById: true,
      createdAt: true,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: points } },
  });

  await prisma.event.update({
    where: { id: eventId },
    data: {
      pointsRemain: { decrement: points },
      pointsAwarded: { increment: points },
    },
  });

  return res.status(201).json(transaction);
};

