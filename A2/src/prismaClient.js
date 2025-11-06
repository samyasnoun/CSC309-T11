// generates one prisma client for whole server to use.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export default prisma;