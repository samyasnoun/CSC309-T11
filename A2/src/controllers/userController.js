import { v4 as uuidv4 } from "uuid";
import prisma from "../prismaClient.js";
import { generateToken } from "../services/jwt.js";
import { hashPassword, comparePassword } from "../services/bcrypt.js";


// POST /users - Register a new user
export const postUser = async (req, res) => {

    const { utorid, name, email } = req.body;

    if (!utorid || !name || !email) {
        throw new Error("Bad Request");
    }

    const utoridRegex = /^[a-zA-Z0-9]{7,8}$/;
    if (!utoridRegex.test(utorid)) {
        throw new Error("Bad Request");
    }


    if (name.length < 1 || name.length > 50) {
        throw new Error("Bad Request");
    }

    
    const emailRegex = /^[A-Za-z0-9._%+-]+@(mail\.)?utoronto\.ca$/;
    if (!emailRegex.test(email)) {
        throw new Error("Bad Request");
    }

    const existing = await prisma.user.findFirst({
        where: { utorid }
    });

    if (existing){
        throw new Error("Conflict");
    }


    const resetToken = uuidv4();
    const resetExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    
    const user = await prisma.user.create({
        data: {
        utorid,
        name,
        email,
        password: "", // Empty password until activated
        verified: false,
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
        },
    });

    if (!user) {
        throw new Error("Bad Request");
    }

    
    return res.status(201).json({
        id: user.id,
        utorid: user.utorid,
        name: user.name,
        email: user.email,
        verified: user.verified,
        expiresAt: user.resetExpiresAt,
        resetToken: user.resetToken
    });
};



// GET /users - Retrieve a list of users. (manager or higher) - this check is done in authentication middleware
export const getUsers = async (req, res) => {
  const { name, role, verified, activated, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

  const where = {};

  if (name) {
    where.OR = [
      { utorid: { contains: String(name), mode: "insensitive" } },
      { name: { contains: String(name), mode: "insensitive" } },
    ];
  }

  if (role) where.role = String(role);

  if (verified !== undefined) {
    if (verified === "true") where.verified = true;
    else if (verified === "false") where.verified = false;
  }

  if (activated !== undefined) {
    if (activated === "true") where.lastLogin = { not: null };
    else if (activated === "false") where.lastLogin = null;
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
    },
  });

  return res.status(200).json({ count, results });
};


// GET /users/me - Get current authenticated user
  export const getCurrentUser = async (req, res) => {
  const me = req.me; 
  if (!me) throw new Error("Unauthorized");

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
      usedByUsers: { none: { id: me.id } }, // user hasn't used it yet
    },
    select: {
      id: true,
      name: true,
      minSpending: true,
      rate: true,
      points: true,
    },
    orderBy: { id: "asc" },
  });

  return res.status(200).json({ ...user, promotions });
}

// GET /users/:userId (separated by roletype)
export const getUserById = async (req, res) => {
  const id = Number(req.params.userId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

  const meRole = req.me?.role; // set by auth middleware
  if (!meRole) throw new Error("Unauthorized");

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
    },
    orderBy: { id: "asc" },
  });

  return res.status(200).json({ ...user, promotions });
};

// PATCH /users/:userId - Update a specific user's data (manager/superuser)
export const patchUserById = async (req, res) => {
  const id = Number(req.params.userId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

  const meRole = req.me?.role;
  if (!meRole) throw new Error("Unauthorized");

  const isManagerOrHigher = meRole === "manager" || meRole === "superuser";
  if (!isManagerOrHigher) throw new Error("Forbidden");

  const { name, email, birthday, role, points, verified, suspicious, avatarUrl } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("Not Found");

  const updates = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.length < 1 || name.length > 50) {
      throw new Error("Bad Request");
    }
    updates.name = name;
  }

  if (email !== undefined) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@(mail\.)?utoronto\.ca$/;
    if (!emailRegex.test(email)) {
      throw new Error("Bad Request");
    }
    updates.email = email;
  }

  if (birthday !== undefined) {
    if (birthday === null) {
      updates.birthday = null;
    } else {
      const date = new Date(birthday);
      if (isNaN(date.getTime())) {
        throw new Error("Bad Request");
      }
      updates.birthday = date;
    }
  }

  if (role !== undefined) {
    const validRoles = ["regular", "cashier", "manager", "superuser"];
    if (!validRoles.includes(role)) {
      throw new Error("Bad Request");
    }
    if (meRole === "manager" && (role === "superuser" || user.role === "superuser")) {
      throw new Error("Forbidden");
    }
    updates.role = role;
  }

  if (points !== undefined) {
    if (!Number.isInteger(points) || points < 0) {
      throw new Error("Bad Request");
    }
    updates.points = points;
  }

  if (verified !== undefined) {
    if (typeof verified !== "boolean") {
      throw new Error("Bad Request");
    }
    updates.verified = verified;
  }

  if (suspicious !== undefined) {
    if (typeof suspicious !== "boolean") {
      throw new Error("Bad Request");
    }
    updates.suspicious = suspicious;
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl !== null && typeof avatarUrl !== "string") {
      throw new Error("Bad Request");
    }
    updates.avatarUrl = avatarUrl;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updates,
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

  return res.status(200).json(updatedUser);
};

// PATCH /users/me - Update current user's info
export const patchCurrentUser = async (req, res) => {
  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const { name, email, birthday, avatarUrl } = req.body;

  const updates = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.length < 1 || name.length > 50) {
      throw new Error("Bad Request");
    }
    updates.name = name;
  }

  if (email !== undefined) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@(mail\.)?utoronto\.ca$/;
    if (!emailRegex.test(email)) {
      throw new Error("Bad Request");
    }
    updates.email = email;
  }

  if (birthday !== undefined) {
    if (birthday === null) {
      updates.birthday = null;
    } else {
      const date = new Date(birthday);
      if (isNaN(date.getTime())) {
        throw new Error("Bad Request");
      }
      updates.birthday = date;
    }
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl !== null && typeof avatarUrl !== "string") {
      throw new Error("Bad Request");
    }
    updates.avatarUrl = avatarUrl;
  }

  const updatedUser = await prisma.user.update({
    where: { id: me.id },
    data: updates,
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

  return res.status(200).json(updatedUser);
};

// PATCH /users/me/password - Update current user's password
export const patchCurrentUserPassword = async (req, res) => {
  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new Error("Bad Request");
  }

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user || !user.password) {
    throw new Error("Unauthorized");
  }

  const passwordMatch = await comparePassword(oldPassword, user.password);
  if (!passwordMatch) {
    throw new Error("Unauthorized");
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
  if (!passwordRegex.test(newPassword)) {
    throw new Error("Bad Request");
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: me.id },
    data: { password: hashedPassword },
  });

  return res.status(200).json({ message: "Password updated successfully" });
};

// GET /users/:userId/transactions - Get user's transactions
export const getUserTransactions = async (req, res) => {
  const id = Number(req.params.userId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const isCashierOrHigher = ["cashier", "manager", "superuser"].includes(me.role);
  if (!isCashierOrHigher) throw new Error("Forbidden");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("Not Found");

  const { type, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

  const where = { userId: id };

  if (type) {
    const validTypes = ["purchase", "redemption", "adjustment", "event", "transfer"];
    if (!validTypes.includes(String(type))) {
      throw new Error("Bad Request");
    }
    where.type = String(type);
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

// GET /users/me/transactions - Get current user's transactions
export const getCurrentUserTransactions = async (req, res) => {
  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const { type, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

  const where = { userId: me.id };

  if (type) {
    const validTypes = ["purchase", "redemption", "adjustment", "event", "transfer"];
    if (!validTypes.includes(String(type))) {
      throw new Error("Bad Request");
    }
    where.type = String(type);
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

// POST /users/:userId/transactions - Create a new transfer transaction
export const postTransferTransaction = async (req, res) => {
  const recipientId = Number(req.params.userId);
  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    throw new Error("Bad Request");
  }

  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const { amount, remark } = req.body;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Bad Request");
  }

  if (me.id === recipientId) {
    throw new Error("Bad Request");
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) throw new Error("Not Found");

  if (me.points < amount) {
    throw new Error("Bad Request");
  }

  const senderTransaction = await prisma.transaction.create({
    data: {
      userId: me.id,
      type: "transfer",
      amount: -amount,
      remark: remark || null,
      relatedId: recipientId,
      createdById: me.id,
    },
  });

  await prisma.user.update({
    where: { id: me.id },
    data: { points: { decrement: amount } },
  });

  const recipientTransaction = await prisma.transaction.create({
    data: {
      userId: recipientId,
      type: "transfer",
      amount: amount,
      remark: remark || null,
      relatedId: me.id,
      createdById: me.id,
    },
  });

  await prisma.user.update({
    where: { id: recipientId },
    data: { points: { increment: amount } },
  });

  return res.status(201).json({
    id: senderTransaction.id,
    userId: senderTransaction.userId,
    type: senderTransaction.type,
    amount: senderTransaction.amount,
    remark: senderTransaction.remark,
    relatedId: senderTransaction.relatedId,
    createdById: senderTransaction.createdById,
    createdAt: senderTransaction.createdAt,
  });
};

// POST /users/me/transactions - Create a new redemption transaction
export const postRedemptionTransaction = async (req, res) => {
  const me = req.me;
  if (!me) throw new Error("Unauthorized");

  const { redeemed, promotionIds } = req.body;

  if (!Number.isInteger(redeemed) || redeemed <= 0) {
    throw new Error("Bad Request");
  }

  if (me.points < redeemed) {
    throw new Error("Bad Request");
  }

  let promotionConnections = [];
  if (promotionIds && Array.isArray(promotionIds)) {
    for (const promoId of promotionIds) {
      if (!Number.isInteger(promoId)) {
        throw new Error("Bad Request");
      }
    }
    promotionConnections = promotionIds.map((id) => ({ id }));
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: me.id,
      type: "redemption",
      amount: -redeemed,
      redeemed: redeemed,
      createdById: me.id,
      promotions: promotionConnections.length > 0 ? { connect: promotionConnections } : undefined,
    },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      redeemed: true,
      remark: true,
      createdById: true,
      createdAt: true,
    },
  });

  await prisma.user.update({
    where: { id: me.id },
    data: { points: { decrement: redeemed } },
  });

  if (promotionIds && Array.isArray(promotionIds)) {
    for (const promoId of promotionIds) {
      const promo = await prisma.promotion.findUnique({ where: { id: promoId } });
      if (promo && promo.type === "onetime") {
        await prisma.promotion.update({
          where: { id: promoId },
          data: {
            usedByUsers: { connect: { id: me.id } },
          },
        });
      }
    }
  }

  return res.status(201).json(transaction);
};

