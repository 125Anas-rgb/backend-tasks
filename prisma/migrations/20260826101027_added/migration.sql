-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('VIEWER', 'EDITOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tier" "Tier" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "NoteCollaborator" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "NoteCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavoriteNote" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NoteCollaborator_taskId_userId_key" ON "NoteCollaborator"("taskId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavoriteNote_taskId_userId_key" ON "UserFavoriteNote"("taskId", "userId");

-- AddForeignKey
ALTER TABLE "NoteCollaborator" ADD CONSTRAINT "NoteCollaborator_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteCollaborator" ADD CONSTRAINT "NoteCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteNote" ADD CONSTRAINT "UserFavoriteNote_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteNote" ADD CONSTRAINT "UserFavoriteNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
