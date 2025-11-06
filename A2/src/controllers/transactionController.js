import prisma from "../prismaClient.js";

// POST /transactions - Create a new transaction (purchase or adjustment)
export const postTransaction = async (req, res) => {
  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isCashierOrHigher = ["cashier", "manager", "superuser"].includes(me.role);
  if (!isCashierOrHigher) throw new Error("Forbidden");

  const { userId, type, amount, spent, remark, promotionIds } = req.body;

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Bad Request");
  }

  const validTypes = ["purchase", "adjustment"];
  if (!type || !validTypes.includes(type)) {
    throw new Error("Bad Request");
  }

  if (!Number.isInteger(amount)) {
    throw new Error("Bad Request");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Not Found");

  // For purchase: amount > 0, spent >= 0
  // For adjustment: amount can be any integer
  if (type === "purchase") {
    if (amount <= 0) {
      throw new Error("Bad Request");
    }
    if (spent === undefined || typeof spent !== "number" || spent < 0) {
      throw new Error("Bad Request");
    }
  }

  let promotionConnections = [];
  let appliedPromotions = [];

  if (type === "purchase" && promotionIds && Array.isArray(promotionIds)) {
    for (const promoId of promotionIds) {
      if (!Number.isInteger(promoId)) {
        throw new Error("Bad Request");
      }
      const promo = await prisma.promotion.findUnique({ where: { id: promoId } });
      if (promo) {
        appliedPromotions.push(promo);
        promotionConnections.push({ id: promoId });
      }
    }
  }

  // Calculate bonus points from automatic promotions
  let bonusPoints = 0;
  if (type === "purchase" && spent !== undefined) {
    const now = new Date();
    const automaticPromotions = await prisma.promotion.findMany({
      where: {
        type: "automatic",
        startTime: { lte: now },
        endTime: { gte: now },
      },
    });

    for (const promo of automaticPromotions) {
      if (promo.minSpending !== null && spent >= promo.minSpending) {
        if (promo.rate !== null) {
          bonusPoints += Math.floor(spent * promo.rate);
        }
        if (promo.points !== null) {
          bonusPoints += promo.points;
        }
        promotionConnections.push({ id: promo.id });
      }
    }
  }

  const totalAmount = amount + bonusPoints;

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type,
      amount: totalAmount,
      spent: type === "purchase" ? spent : null,
      remark: remark || null,
      createdById: me.id,
      promotions: promotionConnections.length > 0 ? { connect: promotionConnections } : undefined,
    },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      spent: true,
      remark: true,
      createdById: true,
      createdAt: true,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: totalAmount } },
  });

  // Mark one-time promotions as used
  if (type === "purchase" && promotionIds && Array.isArray(promotionIds)) {
    for (const promo of appliedPromotions) {
      if (promo.type === "onetime") {
        await prisma.promotion.update({
          where: { id: promo.id },
          data: {
            usedByUsers: { connect: { id: userId } },
          },
        });
      }
    }
  }

  return res.status(201).json(transaction);
};

// GET /transactions - Retrieve a list of transactions
export const getTransactions = async (req, res) => {
  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isCashierOrHigher = ["cashier", "manager", "superuser"].includes(me.role);
  if (!isCashierOrHigher) throw new Error("Forbidden");

  const { userId, type, suspicious, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

  const where = {};

  if (userId !== undefined) {
    const id = Number(userId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Bad Request");
    }
    where.userId = id;
  }

  if (type) {
    const validTypes = ["purchase", "redemption", "adjustment", "event", "transfer"];
    if (!validTypes.includes(String(type))) {
      throw new Error("Bad Request");
    }
    where.type = String(type);
  }

  if (suspicious !== undefined) {
    if (suspicious === "true") where.suspicious = true;
    else if (suspicious === "false") where.suspicious = false;
  }

  const count = await prisma.transaction.count({ where });

  const results = await prisma.transaction.findMany({
    where,
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      spent: true,
      redeemed: true,
      suspicious: true,
      remark: true,
      relatedId: true,
      createdById: true,
      createdAt: true,
      eventId: true,
    },
  });

  return res.status(200).json({ count, results });
};

// GET /transactions/:transactionId - Retrieve a single transaction by ID
export const getTransactionById = async (req, res) => {
  const id = Number(req.params.transactionId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isCashierOrHigher = ["cashier", "manager", "superuser"].includes(me.role);
  if (!isCashierOrHigher) throw new Error("Forbidden");

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      spent: true,
      redeemed: true,
      suspicious: true,
      remark: true,
      relatedId: true,
      createdById: true,
      createdAt: true,
      eventId: true,
    },
  });

  if (!transaction) throw new Error("Not Found");

  return res.status(200).json(transaction);
};

// PATCH /transactions/:transactionId/suspicious - Mark a transaction as suspicious
export const patchTransactionAsSuspiciousById = async (req, res) => {
  const id = Number(req.params.transactionId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isCashierOrHigher = ["cashier", "manager", "superuser"].includes(me.role);
  if (!isCashierOrHigher) throw new Error("Forbidden");

  const { suspicious } = req.body;

  if (typeof suspicious !== "boolean") {
    throw new Error("Bad Request");
  }

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) throw new Error("Not Found");

  const updated = await prisma.transaction.update({
    where: { id },
    data: { suspicious },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      spent: true,
      redeemed: true,
      suspicious: true,
      remark: true,
      relatedId: true,
      createdById: true,
      createdAt: true,
      eventId: true,
    },
  });

  if (suspicious) {
    await prisma.user.update({
      where: { id: transaction.userId },
      data: { suspicious: true },
    });
  }

  return res.status(200).json(updated);
};

// PATCH /transactions/:transactionId/processed - Process a redemption transaction
export const patchRedemptionTransactionStatusById = async (req, res) => {
  const id = Number(req.params.transactionId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isCashierOrHigher = ["cashier", "manager", "superuser"].includes(me.role);
  if (!isCashierOrHigher) throw new Error("Forbidden");

  const { processed } = req.body;

  if (typeof processed !== "boolean") {
    throw new Error("Bad Request");
  }

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) throw new Error("Not Found");

  if (transaction.type !== "redemption") {
    throw new Error("Bad Request");
  }

  if (!processed) {
    // Unprocess: refund points
    await prisma.user.update({
      where: { id: transaction.userId },
      data: { points: { increment: Math.abs(transaction.amount) } },
    });
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      remark: processed ? "processed" : null,
    },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      spent: true,
      redeemed: true,
      suspicious: true,
      remark: true,
      relatedId: true,
      createdById: true,
      createdAt: true,
      eventId: true,
    },
  });

  return res.status(200).json(updated);
};

