const prisma = require("../prismaClient");

const BASE_EVENT_INCLUDE = {
    organizers: {
        select: { id: true, utorid: true, name: true },
        orderBy: { id: "asc" },
    },
    guests: {
        select: { id: true, utorid: true, name: true },
        orderBy: { id: "asc" },
    },
    createdBy: { select: { id: true, utorid: true, name: true } },
    _count: { select: { guests: true, organizers: true } },
};

function serializeEvent(event) {
    return {
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        startTime: event.startTime,
        endTime: event.endTime,
        capacity: event.capacity,
        points: event.points,
        pointsRemain: event.pointsRemain,
        pointsAwarded: event.pointsAwarded,
        published: event.published,
        createdBy: event.createdBy
            ? {
                id: event.createdBy.id,
                utorid: event.createdBy.utorid,
                name: event.createdBy.name,
            }
            : null,
        organizers: event.organizers ?? [],
        guestCount: event._count?.guests ?? event.guests?.length ?? 0,
        guests: event.guests ?? undefined,
    };
}

async function loadViewer(req) {
    if (!req.auth || typeof req.auth.userId !== "number") return null;
    const viewer = await prisma.user.findUnique({ where: { id: req.auth.userId } });
    return viewer;
}

function ensureCapacity(event) {
    if (event.capacity !== null && event._count.guests >= event.capacity) {
        throw new Error("Gone");
    }
}

const postEvent = async (req, res, next) => {
    try {
        const { name, description, location, startTime, endTime, capacity, points } =
            req.body ?? {};

        if (name === undefined || description === undefined || location === undefined || startTime === undefined || endTime === undefined || points === undefined) {
            throw new Error("Bad Request");
        }

        if (!req.me) {
            return res.status(403).json({ error: "Forbidden" });
        }

        if (
            typeof name !== "string" ||
            typeof description !== "string" ||
            typeof location !== "string"
        ) {
            throw new Error("Bad Request");
        }

        if (name.length > 100 || description.length > 1000 || location.length > 200) {
            throw new Error("Bad Request");
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
            throw new Error("Bad Request");
        }

        if (end <= start) {
            throw new Error("Bad Request");
        }

        let capacityValue = null;
        if (capacity !== undefined && capacity !== null) {
            if (!Number.isInteger(capacity) || capacity <= 0) {
                throw new Error("Bad Request");
            }
            capacityValue = capacity;
        }

        if (!Number.isInteger(points) || points <= 0) {
            throw new Error("Bad Request");
        }

        const creator = req.me;

        const event = await prisma.event.create({
            data: {
                name,
                description,
                location,
                startTime: start,
                endTime: end,
                capacity: capacityValue,
                points,
                pointsRemain: points,
                createdById: creator?.id ?? null,
                organizers: creator
                    ? {
                        connect: { id: creator.id },
                    }
                    : undefined,
            },
            include: BASE_EVENT_INCLUDE,
        });

        return res.status(201).json(serializeEvent(event));
    } catch (err) {
        next(err);
    }
};

const getEvents = async (req, res, next) => {
    try {
        const viewer = await loadViewer(req);
        const role = viewer?.role ?? "regular";

        const { page = 1, limit = 10, name, location, started, ended, showFull, published } = req.query ?? {};
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;

        if (!Number.isInteger(pageNum) || pageNum < 1) throw new Error("Bad Request");
        if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100)
            throw new Error("Bad Request");

        if (started !== undefined && ended !== undefined) {
            throw new Error("Bad Request");
        }

        let where = {};
        const conditions = [];

        if (name) {
            conditions.push({ name: { contains: String(name), mode: "insensitive" } });
        }

        if (location) {
            conditions.push({ location: { contains: String(location), mode: "insensitive" } });
        }

        const now = new Date();
        if (started !== undefined) {
            if (started === "true") conditions.push({ startTime: { lte: now } });
            else if (started === "false") conditions.push({ startTime: { gt: now } });
            else throw new Error("Bad Request");
        }

        if (ended !== undefined) {
            if (ended === "true") conditions.push({ endTime: { lt: now } });
            else if (ended === "false") conditions.push({ endTime: { gte: now } });
            else throw new Error("Bad Request");
        }

        if (role === "manager" || role === "superuser") {
            if (published !== undefined) {
                if (published === "true") conditions.push({ published: true });
                else if (published === "false") conditions.push({ published: false });
                else throw new Error("Bad Request");
            }
        } else {
            conditions.push({ published: true });
        }

        if (showFull === "false" || showFull === false) {
            // Filter out full events - this is complex in Prisma, we'll handle it in post-processing
            // For now, we'll fetch all and filter
        }

        if (conditions.length > 0) {
            where = { AND: conditions };
        }

        let allEvents = await prisma.event.findMany({
            where,
            orderBy: { startTime: "asc" },
            include: {
                createdBy: { select: { id: true, utorid: true, name: true } },
                organizers: {
                    select: { id: true, utorid: true, name: true },
                    orderBy: { id: "asc" },
                },
                _count: { select: { guests: true } },
            },
        });

        // Filter out full events if showFull is false
        if (showFull === "false" || showFull === false) {
            allEvents = allEvents.filter(event => {
                if (event.capacity === null) return true;
                return event._count.guests < event.capacity;
            });
        }

        const count = allEvents.length;
        const paginatedEvents = allEvents.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        const results = paginatedEvents.map((event) => {
            const base = {
                id: event.id,
                name: event.name,
                location: event.location,
                startTime: event.startTime,
                endTime: event.endTime,
                capacity: event.capacity,
            };
            
            if (role === "manager" || role === "superuser") {
                base.pointsRemain = event.pointsRemain;
                base.pointsAwarded = event.pointsAwarded;
                base.published = event.published;
            }
            
            base.numGuests = event._count?.guests ?? 0;
            
            return base;
        });
        return res.status(200).json({ count, results });
    } catch (err) {
        next(err);
    }
};

const getEventById = async (req, res, next) => {
    try {
        const id = Number(req.params.eventId);
        if (!Number.isFinite(id) || id <= 0)
            return res.status(404).json({ error: "Not Found" });


        const viewer = await loadViewer(req);
        const role = viewer?.role ?? "regular";

        const event = await prisma.event.findUnique({
            where: { id },
            include: BASE_EVENT_INCLUDE,
        });

        if (!event) return res.status(404).json({ error: "Not Found" });

        const isOrganizer = viewer && event.organizers.some((o) => o.id === viewer.id);
        const isManagerOrHigher = role === "manager" || role === "superuser";

        if (!event.published && !isOrganizer && !isManagerOrHigher) {
            if (role === "regular") {
                return res.status(404).json({ error: "Not Found" });
            }
            return res.status(400).json({ error: "Bad Request" });
        }

        if (role === "regular" || role === "cashier") {
            return res.status(200).json({
                id: event.id,
                name: event.name,
                description: event.description,
                location: event.location,
                startTime: event.startTime,
                endTime: event.endTime,
                capacity: event.capacity,
                organizers: event.organizers,
                numGuests: event._count?.guests ?? event.guests?.length ?? 0,
            });
        }

        return res.status(200).json(serializeEvent(event));
    } catch (err) {
        next(err);
    }
};


const patchEventById = async (req, res, next) => {
    try {
        const id = Number(req.params.eventId);
        if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

        const {
            name,
            description,
            location,
            startTime,
            endTime,
            capacity,
            points,
            published,
        } = req.body ?? {};

        if (
            name === undefined &&
            description === undefined &&
            location === undefined &&
            startTime === undefined &&
            endTime === undefined &&
            capacity === undefined &&
            points === undefined &&
            published === undefined
        ) {
            throw new Error("Bad Request");
        }

        const existing = await prisma.event.findUnique({
            where: { id },
            include: {
                organizers: { select: { id: true } },
                guests: { select: { id: true } },
            },
        });

        if (!existing) throw new Error("Not Found");

        const now = new Date();
        if (existing.endTime <= now) {
            if (name !== undefined || description !== undefined || location !== undefined) {
                throw new Error("Bad Request");
            }
        }

        const data = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim() || name.length > 100) {
                throw new Error("Bad Request");
            }
            data.name = name.trim();
        }

        if (description !== undefined) {
            if (typeof description !== "string" || !description.trim() || description.length > 1000) {
                throw new Error("Bad Request");
            }
            data.description = description.trim();
        }

        if (location !== undefined) {
            if (typeof location !== "string" || !location.trim() || location.length > 200) {
                throw new Error("Bad Request");
            }
            data.location = location.trim();
        }

        if (startTime !== undefined) {
            const start = new Date(startTime);
            if (Number.isNaN(start.valueOf())) throw new Error("Bad Request");
            data.startTime = start;
        }

        if (endTime !== undefined) {
            const end = new Date(endTime);
            if (Number.isNaN(end.valueOf())) throw new Error("Bad Request");
            data.endTime = end;
        }

        if (data.startTime && data.endTime && data.endTime <= data.startTime) {
            throw new Error("Bad Request");
        }

        if (capacity !== undefined) {
            if (capacity === null) {
                data.capacity = null;
            } else if (!Number.isInteger(capacity) || capacity <= 0) {
                throw new Error("Bad Request");
            } else if (existing.guests.length > capacity) {
                throw new Error("Bad Request");
            } else {
                data.capacity = capacity;
            }
        }

        if (points !== undefined) {
            if (!Number.isInteger(points) || points < existing.pointsAwarded) {
                throw new Error("Bad Request");
            }
            const isManager = req.me && (req.me.role === "manager" || req.me.role === "superuser");
            if (!isManager) {
                throw new Error("Forbidden");
            }
            data.points = points;
            data.pointsRemain = points - existing.pointsAwarded;
        }

        if (published !== undefined) {
            if (typeof published !== "boolean") throw new Error("Bad Request");
            if (published && existing.organizers.length === 0) {
                throw new Error("Bad Request");
            }
            const isManager = req.me && (req.me.role === "manager" || req.me.role === "superuser");
            if (!isManager) {
                throw new Error("Forbidden");
            }
            if (published === false) {
                throw new Error("Bad Request");
            }
            data.published = published;
        }

        const updated = await prisma.event.update({
            where: { id },
            data,
            include: BASE_EVENT_INCLUDE,
        });

        const response = {
            id: updated.id,
            name: updated.name,
            location: updated.location,
        };
        
        if (name !== undefined) response.name = updated.name;
        if (description !== undefined) response.description = updated.description;
        if (location !== undefined) response.location = updated.location;
        if (startTime !== undefined) response.startTime = updated.startTime;
        if (endTime !== undefined) response.endTime = updated.endTime;
        if (capacity !== undefined) response.capacity = updated.capacity;
        if (points !== undefined) response.points = updated.points;
        if (published !== undefined) response.published = updated.published;

        return res.status(200).json(response);
    } catch (err) {
        next(err);
    }
};

const deleteEventById = async (req, res, next) => {
    try {
        const id = Number(req.params.eventId);
        if (!Number.isInteger(id) || id <= 0) throw new Error("Bad Request");

        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) throw new Error("Not Found");

        if (event.published) {
            throw new Error("Bad Request");
        }

        await prisma.event.delete({ where: { id } });

        return res.status(204).send();
    } catch (err) {
        next(err);
    }
};

const postOrganizerToEvent = async (req, res, next) => {
    try {
        const eventId = Number(req.params.eventId);
        if (!Number.isInteger(eventId) || eventId <= 0) throw new Error("Bad Request");

        const { utorid } = req.body ?? {};

        if (!utorid) throw new Error("Bad Request");

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                organizers: { select: { id: true } },
                guests: { select: { id: true } },
            },
        });
        if (!event) throw new Error("Not Found");

        if (event.endTime <= new Date()) {
            throw new Error("Gone");
        }

        const target = await prisma.user.findFirst({
            where: { utorid: String(utorid).toLowerCase() },
            select: { id: true, utorid: true, name: true },
        });

        if (!target) {
            throw new Error("Not Found");
        }

        if (event.organizers.some((o) => o.id === target.id)) {
            throw new Error("Conflict");
        }

        if (event.guests.some((g) => g.id === target.id)) {
            throw new Error("Bad Request");
        }

        const updated = await prisma.event.update({
            where: { id: eventId },
            data: { organizers: { connect: { id: target.id } } },
            include: {
                organizers: {
                    select: { id: true, utorid: true, name: true },
                    orderBy: { id: "asc" },
                },
            },
        });

        return res.status(201).json({
            id: eventId,
            name: event.name,
            location: event.location,
            organizers: updated.organizers,
        });
    } catch (err) {
        next(err);
    }
};

const removeOrganizerFromEvent = async (req, res, next) => {
    try {
        const eventId = Number(req.params.eventId);
        const userId = Number(req.params.userId);

        if (!Number.isInteger(eventId) || eventId <= 0) throw new Error("Bad Request");
        if (!Number.isInteger(userId) || userId <= 0) throw new Error("Bad Request");

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                organizers: { select: { id: true } },
            },
        });

        if (!event) throw new Error("Not Found");

        if (event.endTime <= new Date()) {
            throw new Error("Gone");
        }

        const isOrganizer = event.organizers.some((o) => o.id === userId);
        if (!isOrganizer) {
            throw new Error("Not Found");
        }

        const isManager = req.me && (req.me.role === "manager" || req.me.role === "superuser");
        if (!isManager) {
            throw new Error("Forbidden");
        }

        if (event.organizers.length <= 1) {
            throw new Error("Bad Request");
        }

        await prisma.event.update({
            where: { id: eventId },
            data: { organizers: { disconnect: { id: userId } } },
        });

        return res.status(204).send();
    } catch (err) {
        next(err);
    }
};

const postGuestToEvent = async (req, res, next) => {
    try {
        const eventId = Number(req.params.eventId);
        if (!Number.isInteger(eventId) || eventId <= 0) throw new Error("Bad Request");

        const { utorid } = req.body ?? {};
        if (!utorid) throw new Error("Bad Request");

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                organizers: { select: { id: true } },
                guests: { select: { id: true } },
                _count: { select: { guests: true } },
            },
        });

        if (!event) throw new Error("Not Found");

        if (event.endTime <= new Date()) {
            throw new Error("Gone");
        }

        ensureCapacity(event);

        const target = await prisma.user.findFirst({
            where: { utorid: String(utorid).toLowerCase() },
            select: { id: true, utorid: true, name: true },
        });

        if (!target) {
            throw new Error("Not Found");
        }

        if (event.organizers.some((o) => o.id === target.id)) {
            throw new Error("Bad Request");
        }

        const alreadyGuest = event.guests.some((g) => g.id === target.id);

        if (!alreadyGuest) {
            await prisma.event.update({
                where: { id: eventId },
                data: { guests: { connect: { id: target.id } } },
            });
        }

        const updated = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                _count: { select: { guests: true } },
            },
        });

        return res.status(201).json({
            id: eventId,
            name: event.name,
            location: event.location,
            guestAdded: { id: target.id, utorid: target.utorid, name: target.name },
            numGuests: updated._count.guests,
        });
    } catch (err) {
        next(err);
    }
};

const deleteGuestFromEvent = async (req, res, next) => {
    try {
        const eventId = Number(req.params.eventId);
        const userId = Number(req.params.userId);

        if (!Number.isInteger(eventId) || eventId <= 0) throw new Error("Bad Request");
        if (!Number.isInteger(userId) || userId <= 0) throw new Error("Bad Request");

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: { guests: { select: { id: true } } },
        });

        if (!event) throw new Error("Not Found");

        if (event.endTime <= new Date()) {
            throw new Error("Gone");
        }

        if (!event.guests.some((g) => g.id === userId)) {
            throw new Error("Not Found");
        }

        await prisma.event.update({
            where: { id: eventId },
            data: { guests: { disconnect: { id: userId } } },
        });

        return res.status(200).json({ id: userId });
    } catch (err) {
        next(err);
    }
};

const postCurrentUserToEvent = async (req, res, next) => {
    try {
        const viewer = await loadViewer(req);
        if (!viewer) throw new Error("Unauthorized");

        const eventId = Number(req.params.eventId);
        if (!Number.isInteger(eventId) || eventId <= 0) throw new Error("Bad Request");

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                organizers: { select: { id: true } },
                guests: { select: { id: true } },
                _count: { select: { guests: true } },
            },
        });

        if (!event) throw new Error("Not Found");

        if (!event.published) {
            throw new Error("Not Found");
        }

        if (event.endTime <= new Date()) {
            throw new Error("Gone");
        }

        if (event.organizers.some((o) => o.id === viewer.id)) {
            throw new Error("Bad Request");
        }

        ensureCapacity(event);

        const alreadyGuest = event.guests.some((g) => g.id === viewer.id);

        if (alreadyGuest) {
            throw new Error("Bad Request");
        }

        const updated = await prisma.event.update({
            where: { id: eventId },
            data: { guests: { connect: { id: viewer.id } } },
            include: {
                _count: { select: { guests: true } },
            },
        });

        return res.status(201).json({
            id: eventId,
            name: event.name,
            location: event.location,
            guestAdded: { id: viewer.id, utorid: viewer.utorid, name: viewer.name },
            numGuests: updated._count.guests,
        });
    } catch (err) {
        next(err);
    }
};

const removeCurrentUserFromEvent = async (req, res, next) => {
    try {
        const viewer = await loadViewer(req);
        if (!viewer) throw new Error("Unauthorized");

        const eventId = Number(req.params.eventId);
        if (!Number.isInteger(eventId) || eventId <= 0) throw new Error("Bad Request");

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                guests: { select: { id: true } },
            },
        });

        if (!event) throw new Error("Not Found");

        if (event.endTime <= new Date()) {
            throw new Error("Gone");
        }

        if (!event.guests.some((g) => g.id === viewer.id)) {
            throw new Error("Not Found");
        }

        await prisma.event.update({
            where: { id: eventId },
            data: { guests: { disconnect: { id: viewer.id } } },
        });

        return res.status(204).send();
    } catch (err) {
        next(err);
    }
};

const createRewardTransaction = async (req, res, next) => {
    try {
        const eventId = Number(req.params.eventId);
        if (!Number.isInteger(eventId) || eventId <= 0) throw new Error("Bad Request");

        const { type, utorid, amount, remark = "" } = req.body ?? {};

        if (type !== "event") throw new Error("Bad Request");
        if (!Number.isInteger(amount) || amount <= 0) {
            throw new Error("Bad Request");
        }

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                organizers: { select: { id: true } },
                guests: { select: { id: true, utorid: true, name: true } },
            },
        });

        if (!event) throw new Error("Not Found");

        const requester = req.me || (await loadViewer(req));

        const isOrganizer = requester && event.organizers.some((o) => o.id === requester.id);
        if (!requester || (!isOrganizer && !["manager", "superuser"].includes(requester.role))) {
            throw new Error("Forbidden");
        }

        if (utorid === undefined) {
            // Award to all guests
            if (event.pointsRemain < amount * event.guests.length) {
                throw new Error("Bad Request");
            }

            const transactions = await prisma.$transaction(async (tx) => {
                const created = [];
                for (const guest of event.guests) {
                    const transaction = await tx.transaction.create({
                        data: {
                            userId: guest.id,
                            type: "event",
                            amount,
                            remark: typeof remark === "string" ? remark : "",
                            eventId,
                            relatedId: eventId,
                            createdById: requester.id,
                        },
                    });

                    await tx.user.update({
                        where: { id: guest.id },
                        data: { points: { increment: amount } },
                    });

                    created.push(transaction);
                }

                await tx.event.update({
                    where: { id: eventId },
                    data: {
                        pointsAwarded: { increment: amount * event.guests.length },
                        pointsRemain: { decrement: amount * event.guests.length },
                    },
                });

                return created;
            });

            return res.status(201).json(transactions.map((t) => ({
                id: t.id,
                recipient: event.guests.find(g => g.id === t.userId)?.utorid,
                awarded: t.amount,
                type: t.type,
                relatedId: t.relatedId,
                remark: t.remark,
                createdBy: requester.utorid,
            })));
        } else {
            // Award to specific guest
            const targetUtorid = String(utorid).toLowerCase();
            const targetGuest = event.guests.find(g => g.utorid.toLowerCase() === targetUtorid);
            
            if (!targetGuest) {
                throw new Error("Bad Request");
            }

            if (event.pointsRemain < amount) {
                throw new Error("Bad Request");
            }

            const transaction = await prisma.$transaction(async (tx) => {
                const created = await tx.transaction.create({
                    data: {
                        userId: targetGuest.id,
                        type: "event",
                        amount,
                        remark: typeof remark === "string" ? remark : "",
                        eventId,
                        relatedId: eventId,
                        createdById: requester.id,
                    },
                });

                await tx.user.update({
                    where: { id: targetGuest.id },
                    data: { points: { increment: amount } },
                });

                await tx.event.update({
                    where: { id: eventId },
                    data: {
                        pointsAwarded: { increment: amount },
                        pointsRemain: { decrement: amount },
                    },
                });

                return created;
            });

            return res.status(201).json({
                id: transaction.id,
                recipient: targetGuest.utorid,
                awarded: transaction.amount,
                type: transaction.type,
                relatedId: transaction.relatedId,
                remark: transaction.remark,
                createdBy: requester.utorid,
            });
        }
    } catch (err) {
        if (err.details === "missing guest") {
            return res.status(400).json({ error: "Bad Request" });
        }
        if (err.statusCode === 410) {
            return res.status(410).json({ error: "Gone" });
        }
        next(err);
    }
};

module.exports = {
    postEvent,
    getEvents,
    getEventById,
    patchEventById,
    deleteEventById,
    postOrganizerToEvent,
    removeOrganizerFromEvent,
    postGuestToEvent,
    deleteGuestFromEvent,
    postCurrentUserToEvent,
    removeCurrentUserFromEvent,
    createRewardTransaction,
};
