/*
  Warnings:

  - You are about to drop the column `ebID` on the `TimeRegional` table. All the data in the column will be lost.
  - Added the required column `type` to the `TimeRegional` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `TimeRegional` DROP FOREIGN KEY `TimeRegional_ebID_fkey`;

-- AlterTable
ALTER TABLE `EB` ADD COLUMN `timeID` INTEGER NULL;

-- AlterTable
ALTER TABLE `TimeRegional` DROP COLUMN `ebID`,
    ADD COLUMN `type` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `EB` ADD CONSTRAINT `EB_timeID_fkey` FOREIGN KEY (`timeID`) REFERENCES `TimeRegional`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
