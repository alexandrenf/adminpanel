/*
  Warnings:

  - Added the required column `acronym` to the `Regional` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Regional` ADD COLUMN `acronym` VARCHAR(191) NOT NULL;
