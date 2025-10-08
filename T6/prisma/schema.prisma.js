// prisma/schema.prisma
datasource db {
    provider = "sqlite"
    url      = "file:./dev.db"
  }
  
  generator client {
    provider = "prisma-client-js"
  }
  
  model User {
    id       Int    @id @default(autoincrement())
    username String @unique
    password String
  
    // Relations
    notes Note[]
  }
  
  model Note {
    id          Int     @id @default(autoincrement())
    title       String
    description String
    completed   Boolean
    public      Boolean
  
    // FK to User (exactly one owner)
    userId Int
    user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  }