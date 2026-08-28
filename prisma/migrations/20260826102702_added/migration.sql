/*
  Warnings:

  - Added the required column `role` to the `NoteCollaborator` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NoteCollaborator" ADD COLUMN     "role" "Role" NOT NULL;
