import prisma from "../prismaClient.js";

// POST /promotions - Create a new promotion
export const postPromotion = async (req, res) => {
  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!isManagerOrHigher) throw new Error("Forbidden");

  const { name, description, type, startTime, endTime, rate, points, minSpending } = req.body;

  if (!name || typeof name !== "string" || name.length === 0) {
    throw new Error("Bad Request");
  }

  if (!description || typeof description !== "string") {
    throw new Error("Bad Request");
  }

  const validTypes = ["automatic", "onetime"];
  if (!type || !validTypes.includes(type)) {
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

  const data = {
    name,
    description,
    type,
    startTime: start,
    endTime: end,
  };

  if (rate !== undefined && rate !== null) {
    if (typeof rate !== "number" || rate < 0) {
      throw new Error("Bad Request");
    }
    data.rate = rate;
  }

  if (points !== undefined && points !== null) {
    if (!Number.isInteger(points) || points < 0) {
      throw new Error("Bad Request");
    }
    data.points = points;
  }

  if (minSpending !== undefined && minSpending !== null) {
    if (typeof minSpending !== "number" || minSpending < 0) {
      throw new Error("Bad Request");
    }
    data.minSpending = minSpending;
  }

  const promotion = await prisma.promotion.create({
    data,
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      startTime: true,
      endTime: true,
      rate: true,
      points: true,
      minSpending: true,
    },
  });

  return res.status(201).json(promotion);
};

// GET /promotions - Retrieve a list of promotions
export const getPromotions = async (req, res) => {
  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!isManagerOrHigher) throw new Error("Forbidden");

  const { name, type, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

  const where = {};

  if (name) {
    where.name = { contains: String(name), mode: "insensitive" };
  }

  if (type) {
    const validTypes = ["automatic", "onetime"];
    if (!validTypes.includes(String(type))) {
      throw new Error("Bad Request");
    }
    where.type = String(type);
  }

  const count = await prisma.promotion.count({ where });

  const results = await prisma.promotion.findMany({
    where,
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      startTime: true,
      endTime: true,
      rate: true,
      points: true,
      minSpending: true,
    },
  });

  return res.status(200).json({ count, results });
};

// GET /promotions/:promotionId - Retrieve a single promotion by ID
export const getPromotionById = async (req, res) => {
  const id = Number(req.params.promotionId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!isManagerOrHigher) throw new Error("Forbidden");

  const promotion = await prisma.promotion.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      startTime: true,
      endTime: true,
      rate: true,
      points: true,
      minSpending: true,
    },
  });

  if (!promotion) throw new Error("Not Found");

  return res.status(200).json(promotion);
};

// PATCH /promotions/:promotionId - Update a promotion
export const patchPromotionById = async (req, res) => {
  const id = Number(req.params.promotionId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!isManagerOrHigher) throw new Error("Forbidden");

  const promotion = await prisma.promotion.findUnique({ where: { id } });
  if (!promotion) throw new Error("Not Found");

  const { name, description, type, startTime, endTime, rate, points, minSpending } = req.body;

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

  if (type !== undefined) {
    const validTypes = ["automatic", "onetime"];
    if (!validTypes.includes(type)) {
      throw new Error("Bad Request");
    }
    updates.type = type;
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
    const finalStart = updates.startTime || promotion.startTime;
    const finalEnd = updates.endTime || promotion.endTime;
    if (finalStart >= finalEnd) {
      throw new Error("Bad Request");
    }
  }

  if (rate !== undefined) {
    if (rate === null) {
      updates.rate = null;
    } else if (typeof rate !== "number" || rate < 0) {
      throw new Error("Bad Request");
    } else {
      updates.rate = rate;
    }
  }

  if (points !== undefined) {
    if (points === null) {
      updates.points = null;
    } else if (!Number.isInteger(points) || points < 0) {
      throw new Error("Bad Request");
    } else {
      updates.points = points;
    }
  }

  if (minSpending !== undefined) {
    if (minSpending === null) {
      updates.minSpending = null;
    } else if (typeof minSpending !== "number" || minSpending < 0) {
      throw new Error("Bad Request");
    } else {
      updates.minSpending = minSpending;
    }
  }

  const updatedPromotion = await prisma.promotion.update({
    where: { id },
    data: updates,
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      startTime: true,
      endTime: true,
      rate: true,
      points: true,
      minSpending: true,
    },
  });

  return res.status(200).json(updatedPromotion);
};

// DELETE /promotions/:promotionId - Delete a promotion
export const deletePromotionById = async (req, res) => {
  const id = Number(req.params.promotionId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isManagerOrHigher = ["manager", "superuser"].includes(me.role);
  if (!isManagerOrHigher) throw new Error("Forbidden");

  const promotion = await prisma.promotion.findUnique({ where: { id } });
  if (!promotion) throw new Error("Not Found");

  await prisma.promotion.delete({ where: { id } });

  return res.status(200).json({ message: "Promotion deleted successfully" });
};

