/*
  Warnings:

  - You are about to drop the column `color` on the `Config` table. All the data in the column will be lost.
  - You are about to drop the column `toggleColor` on the `Config` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Config` DROP COLUMN `color`,
    DROP COLUMN `toggleColor`,
    ADD COLUMN `title` VARCHAR(191) NULL;
