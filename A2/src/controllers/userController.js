const { v4: uuidv4 } = require("uuid");
const prisma = require("../prismaClient");
const { hashPassword, comparePassword } = require("../services/bcrypt");

const VALID_ROLES = ["regular", "cashier", "manager", "superuser"]; // keep in sync with schema

async function loadCurrentUser(req) {
  if (!req.auth || typeof req.auth.userId !== "number") {
    throw new Error("Unauthorized");
  }

  const me = await prisma.user.findUnique({
    where: { id: req.auth.userId },
  });

  if (!me) throw new Error("Unauthorized");
  return me;
}


// POST /users - Register a new user
const postUser = async (req, res, next) => {
  try {
    const { utorid, name, email } = req.body;

    if (!utorid || !name || !email) throw new Error("Bad Request");

    const utoridRegex = /^[a-zA-Z0-9]{7,8}$/;
    if (!utoridRegex.test(utorid)) throw new Error("Bad Request");

    const normalizedUtorid = utorid.toLowerCase();

    if (name.length < 1 || name.length > 50) throw new Error("Bad Request");

    const emailRegex = /^[A-Za-z0-9._%+-]+@(mail\.)?utoronto\.ca$/;
    if (!emailRegex.test(email)) throw new Error("Bad Request");

    const existing = await prisma.user.findFirst({ where: { utorid: normalizedUtorid } });
    if (existing) throw new Error("Conflict");

    const resetToken = uuidv4();
    const resetExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const hashedPassword = await hashPassword(uuidv4());

    const roleToAssign = (() => {
      if (!req.me) return "regular";
      const desired = req.body.role || "regular";
      if (!VALID_ROLES.includes(desired)) throw new Error("Bad Request");

      if (req.me.role === "cashier" && desired !== "regular") {
        throw new Error("Forbidden");
      }

      if (req.me.role === "manager" && desired === "superuser") {
        throw new Error("Forbidden");
      }

      return desired;
    })();

    const user = await prisma.user.create({
      data: {
        utorid: normalizedUtorid,
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: roleToAssign,
        verified: req.body.verified === true,
        resetToken,
        resetExpiresAt,
      },
      select: {
        id: true,
        utorid: true,
        name: true,
        email: true,
        verified: true,
        resetToken: true,
        resetExpiresAt: true,
        role: true,
        points: true,
        suspicious: true,
      },
    });

    return res.status(201).json({
      ...user,
      expiresAt: user.resetExpiresAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
};


// GET /users - Retrieve a list of users (manager or higher)
const getUsers = async (req, res, next) => {
  try {
    const { name, role, verified, activated, page = 1, limit = 10 } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (!Number.isInteger(pageNum) || pageNum < 1) {
      throw new Error("Bad Request");
    }

    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new Error("Bad Request");
    }

    const where = {};

    if (name) {
      const searchTerm = String(name);
      where.OR = [
        { utorid: { contains: searchTerm } },
        { name: { contains: searchTerm } },
      ];
    }

    if (role) {
      if (!VALID_ROLES.includes(String(role))) throw new Error("Bad Request");
      where.role = String(role);
    }

    if (verified !== undefined) {
      if (verified === "true") where.verified = true;
      else if (verified === "false") where.verified = false;
      else throw new Error("Bad Request");
    }

    if (activated !== undefined) {
      if (activated === "true") where.lastLogin = { not: null };
      else if (activated === "false") where.lastLogin = null;
      else throw new Error("Bad Request");
    }

    const count = await prisma.user.count({ where });

    const results = await prisma.user.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { id: "asc" },
      select: {
        id: true,
        utorid: true,
        name: true,
        email: true,
        birthday: true,
        role: true,
        points: true,
        createdAt: true,
        lastLogin: true,
        verified: true,
        avatarUrl: true,
        suspicious: true,
      },
    });

    return res.status(200).json({ count, results });
  } catch (err) {
    next(err);
  }
};


// GET /users/me - Get current authenticated user
const getCurrentUser = async (req, res, next) => {
  try {
    const me = await loadCurrentUser(req);

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: {
        id: true,
        utorid: true,
        name: true,
        email: true,
        birthday: true,
        role: true,
        points: true,
        createdAt: true,
        lastLogin: true,
        verified: true,
        avatarUrl: true,
      },
    });
    if (!user) throw new Error("Not Found");

    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        type: "onetime",
        startTime: { lte: now },
        endTime: { gte: now },
        usedByUsers: { none: { id: me.id } },
      },
      select: {
        id: true,
        name: true,
        minSpending: true,
        rate: true,
        points: true,
        startTime: true,
        endTime: true,
        description: true,
        type: true,
      },
      orderBy: { id: "asc" },
    });

    const formattedPromotions = promotions.map(p => ({
      ...p,
      type: p.type === "onetime" ? "one-time" : p.type,
    }));

    return res.status(200).json({ ...user, promotions: formattedPromotions });
  } catch (err) {
    next(err);
  }
};


// GET /users/:userId
const getUserById = async (req, res, next) => {
  try {
    const id = Number(req.params.userId);
    if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

    const meRole = req.me?.role;
    if (!meRole || (meRole !== "cashier" && meRole !== "manager" && meRole !== "superuser")) {
      throw new Error("Unauthorized");
    }

    const isManagerOrHigher = meRole === "manager" || meRole === "superuser";

    const selectFields = isManagerOrHigher
      ? {
          id: true,
          utorid: true,
          name: true,
          email: true,
          birthday: true,
          role: true,
          points: true,
          createdAt: true,
          lastLogin: true,
          verified: true,
          avatarUrl: true,
        }
      : {
          id: true,
          utorid: true,
          name: true,
          points: true,
          verified: true,
        };

    const user = await prisma.user.findUnique({
      where: { id },
      select: selectFields,
    });
    if (!user) throw new Error("Not Found");

    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        type: "onetime",
        startTime: { lte: now },
        endTime: { gte: now },
        usedByUsers: { none: { id } },
      },
      select: {
        id: true,
        name: true,
        minSpending: true,
        rate: true,
        points: true,
        type: true,
      },
      orderBy: { id: "asc" },
    });

    const formattedPromotions = promotions.map(p => ({
      ...p,
      type: p.type === "onetime" ? "one-time" : p.type,
    }));

    return res.status(200).json({ ...user, promotions: formattedPromotions });
  } catch (err) {
    next(err);
  }
};


// PATCH /users/:userId
const patchUserById = async (req, res, next) => {
  try {
    const id = Number(req.params.userId);
    if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

    const { email, verified, suspicious, role } = req.body;

    // Check for extra fields and empty body
    const allowedFields = ['email', 'verified', 'suspicious', 'role'];
    const requestFields = Object.keys(req.body);
    const hasExtraFields = requestFields.some(field => !allowedFields.includes(field));
    
    if (requestFields.length === 0 || hasExtraFields) {
      throw new Error("Bad Request");
    }

    const meRole = req.me?.role;
    if (!meRole) throw new Error("Unauthorized");

    if (role !== undefined) {
      if (!["regular", "cashier", "manager", "superuser"].includes(role))
        throw new Error("Bad Request");

      if (meRole === "manager" && !["regular", "cashier", "manager"].includes(role))
        throw new Error("Forbidden");
      
      if (meRole === "superuser" && role === "superuser" && id === req.me.id) {
        throw new Error("Bad Request");
      }
    }
    
    if (suspicious !== undefined) {
      if (meRole !== "manager" && meRole !== "superuser") {
        throw new Error("Forbidden");
      }
    }

    if (email !== undefined) {
      const emailOk = typeof email === "string" &&
        /^[A-Za-z0-9._%+-]+@(mail\.)?utoronto\.ca$/.test(email);
      if (!emailOk) throw new Error("Bad Request");
    }

    if (verified !== undefined && verified !== true) throw new Error("Bad Request");

    if (suspicious !== undefined && typeof suspicious !== "boolean")
      throw new Error("Bad Request");

    const current = await prisma.user.findUnique({
      where: { id },
      select: { id: true, utorid: true, name: true, suspicious: true, role: true }
    });
    if (!current) throw new Error("Not Found");

    const data = {};
    const response = { id: current.id, utorid: current.utorid, name: current.name };

    if (email !== undefined) data.email = email.toLowerCase();
    if (verified !== undefined) data.verified = true;
    if (suspicious !== undefined) data.suspicious = suspicious;
    if (role !== undefined) data.role = role;

    if (role === "cashier" && suspicious === true) {
      throw new Error("Bad Request");
    }
    
    if (role === "cashier" && current.suspicious === true && suspicious === undefined) {
      data.suspicious = false;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        utorid: true,
        name: true,
        email: true,
        verified: true,
        suspicious: true,
        role: true,
      },
    });

    if (email !== undefined) response.email = updated.email;
    if (verified !== undefined) response.verified = updated.verified;
    if (
      suspicious !== undefined ||
      (role === "cashier" && current.suspicious === true && suspicious === undefined)
    ) response.suspicious = updated.suspicious;
    if (role !== undefined) response.role = updated.role;

    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};


// Unimplemented placeholders
const patchCurrentUser = async (req, res, next) => {
  try {
    const me = await loadCurrentUser(req);

    const { name, email, birthday, avatar } = req.body ?? {};

    // Check for extra fields and empty body
    const allowedFields = ['name', 'email', 'birthday', 'avatar'];
    const requestFields = Object.keys(req.body);
    const hasExtraFields = requestFields.some(field => !allowedFields.includes(field));
    
    if (requestFields.length === 0 || hasExtraFields) {
      throw new Error("Bad Request");
    }

    const data = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0 || name.length > 50) {
        throw new Error("Bad Request");
      }
      data.name = name.trim();
    }

    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !/^[A-Za-z0-9._%+-]+@(mail\.)?utoronto\.ca$/.test(email)
      ) {
        throw new Error("Bad Request");
      }
      data.email = email.toLowerCase();
    }

    if (birthday !== undefined) {
      if (birthday === null || birthday === "") {
        data.birthday = null;
      } else {
        const parsed = new Date(birthday);
        if (Number.isNaN(parsed.valueOf())) {
          throw new Error("Bad Request");
        }
        data.birthday = parsed;
      }
    }

    if (avatar !== undefined) {
      if (avatar === null || avatar === "") {
        data.avatarUrl = null;
      } else if (typeof avatar !== "string" || avatar.length > 2048) {
        throw new Error("Bad Request");
      } else {
        data.avatarUrl = avatar;
      }
    }

    const updated = await prisma.user.update({
      where: { id: me.id },
      data,
      select: {
        id: true,
        utorid: true,
        name: true,
        email: true,
        birthday: true,
        role: true,
        points: true,
        createdAt: true,
        lastLogin: true,
        verified: true,
        avatarUrl: true,
      },
    });

    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

const patchCurrentUserPassword = async (req, res, next) => {
  try {
    const me = await loadCurrentUser(req);

    const { old, new: newPassword } = req.body ?? {};

    if (!old || !newPassword) {
      throw new Error("Bad Request");
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new Error("Bad Request");
    }

    const matches = await comparePassword(old, me.password);
    if (!matches) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: me.id },
      data: { password: hashed },
    });

    return res.status(200).json({ message: "Password updated" });
  } catch (err) {
    next(err);
  }
};

const postRedemptionTransaction = async (req, res, next) => {
  try {
    const me = await loadCurrentUser(req);
    const { type, amount, remark = "" } = req.body ?? {};

    if (type !== "redemption") throw new Error("Bad Request");
    const amountValue = Number(amount);
    if (!Number.isInteger(amountValue) || amountValue <= 0) throw new Error("Bad Request");

    if (!me.verified) {
      throw new Error("Forbidden");
    }

    if (me.points < amountValue) {
      const error = new Error("Bad Request");
      error.code = "INSUFFICIENT_POINTS";
      throw error;
    }

    const fresh = await prisma.user.findUnique({
      where: { id: me.id },
      select: { points: true },
    });

    if (!fresh || fresh.points < amountValue) {
      const error = new Error("Bad Request");
      error.code = "INSUFFICIENT_POINTS";
      throw error;
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: me.id,
        type: "redemption",
        amount: amountValue,
        redeemed: null,
        remark: typeof remark === "string" ? remark : "",
        createdById: me.id,
      },
      include: {
        promotions: { select: { id: true } },
        createdBy: { select: { utorid: true } },
      },
    });

    return res.status(201).json({
      id: transaction.id,
      utorid: me.utorid,
      type: transaction.type,
      processedBy: null,
      amount: transaction.amount,
      remark: transaction.remark || "",
      createdBy: transaction.createdBy?.utorid || null,
    });
  } catch (err) {
    if (err.code === "INSUFFICIENT_POINTS") {
      return res.status(400).json({ error: "Bad Request" });
    }
    next(err);
  }
};

const buildTransactionResponse = (record) => ({
  id: record.id,
  type: record.type,
  amount: record.amount,
  spent: record.spent ?? null,
  redeemed: record.redeemed ?? null,
  suspicious: record.suspicious,
  remark: record.remark || "",
  createdAt: record.createdAt,
  relatedId: record.relatedId ?? undefined,
  promotionIds: record.promotions?.map((p) => p.id) ?? [],
  createdBy: record.createdBy ? record.createdBy.utorid : null,
  eventId: record.eventId ?? undefined,
});

const getCurrentUserTransactions = async (req, res, next) => {
  try {
    const me = await loadCurrentUser(req);

    const { page = 1, limit = 10, type, relatedId, promotionId, amount, operator } = req.query ?? {};
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (!Number.isInteger(pageNum) || pageNum < 1) throw new Error("Bad Request");
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100)
      throw new Error("Bad Request");

    const where = { userId: me.id };

    if (type) where.type = type;
    if (relatedId) {
      const rid = Number(relatedId);
      if (isNaN(rid)) throw new Error("Bad Request");
      where.relatedId = rid;
    }
    if (promotionId) {
      const pid = Number(promotionId);
      if (isNaN(pid)) throw new Error("Bad Request");
      where.promotions = { some: { id: pid } };
    }
    if (amount !== undefined) {
      const amt = Number(amount);
      if (isNaN(amt) || !["gte", "lte"].includes(operator))
        throw new Error("Bad Request");
      where.amount = { [operator]: amt };
    } else if (operator) throw new Error("Bad Request");

    const [count, rows] = await prisma.$transaction([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          promotions: { select: { id: true } },
          createdBy: { select: { utorid: true } },
        },
      }),
    ]);

    return res.status(200).json({
      count,
      results: rows.map(buildTransactionResponse),
    });
  } catch (err) {
    next(err);
  }
};

const getUserTransactions = async (req, res, next) => {
  try {
    const id = Number(req.params.userId);
    if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

    const { page = 1, limit = 20 } = req.query ?? {};
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (!Number.isInteger(pageNum) || pageNum < 1) throw new Error("Bad Request");
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100)
      throw new Error("Bad Request");

    const userExists = await prisma.user.count({ where: { id } });
    if (!userExists) throw new Error("Not Found");

    const [count, rows] = await prisma.$transaction([
      prisma.transaction.count({ where: { userId: id } }),
      prisma.transaction.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          promotions: { select: { id: true } },
          createdBy: { select: { utorid: true } },
        },
      }),
    ]);

    return res.status(200).json({
      count,
      results: rows.map(buildTransactionResponse),
    });
  } catch (err) {
    next(err);
  }
};

const postTransferTransaction = async (req, res, next) => {
  try {
    const sender = await loadCurrentUser(req);
    const recipientId = Number(req.params.userId);

    if (!Number.isInteger(recipientId) || recipientId <= 0) {
      throw new Error("Bad Request");
    }

    if (recipientId === sender.id) {
      throw new Error("Bad Request");
    }

    const { type, amount, remark = "" } = req.body ?? {};

    if (type !== "transfer") throw new Error("Bad Request");
    const amountValue = Number(amount);
    if (!Number.isInteger(amountValue) || amountValue <= 0) throw new Error("Bad Request");

    if (!sender.verified) {
      throw new Error("Forbidden");
    }

    const result = await prisma.$transaction(async (tx) => {
      const receiver = await tx.user.findUnique({ where: { id: recipientId } });
      if (!receiver) throw new Error("Not Found");

      const freshSender = await tx.user.findUnique({
        where: { id: sender.id },
        select: { points: true },
      });

      if (!freshSender || freshSender.points < amountValue) {
        const err = new Error("Bad Request");
        err.code = "INSUFFICIENT_POINTS";
        throw err;
      }

      await tx.user.update({
        where: { id: sender.id },
        data: { points: { decrement: amountValue } },
      });

      await tx.user.update({
        where: { id: receiver.id },
        data: { points: { increment: amountValue } },
      });

      const outbound = await tx.transaction.create({
        data: {
          userId: sender.id,
          type: "transfer",
          amount: -amountValue,
          remark: typeof remark === "string" ? remark : "",
          createdById: sender.id,
          relatedId: recipientId,
        },
      });

      const inbound = await tx.transaction.create({
        data: {
          userId: receiver.id,
          type: "transfer",
          amount: amountValue,
          relatedId: sender.id,
          remark: typeof remark === "string" ? remark : "",
          createdById: sender.id,
        },
      });

      return { outbound, inbound, receiver };
    });

    return res.status(201).json({
      id: result.outbound.id,
      sender: sender.utorid,
      recipient: result.receiver.utorid,
      type: "transfer",
      sent: amountValue,
      remark: typeof remark === "string" ? remark : "",
      createdBy: sender.utorid,
    });
  } catch (err) {
    if (err.code === "INSUFFICIENT_POINTS") {
      return res.status(400).json({ error: "Bad Request" });
    }
    next(err);
  }
};


module.exports = {
  postUser,
  getUsers,
  getCurrentUser,
  getUserById,
  patchUserById,
  patchCurrentUser,
  patchCurrentUserPassword,
  postRedemptionTransaction,
  getCurrentUserTransactions,
  getUserTransactions,
  postTransferTransaction,
};