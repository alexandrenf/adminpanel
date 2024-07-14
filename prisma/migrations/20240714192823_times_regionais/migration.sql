/*
  Warnings:

  - Added the required column `regionalID` to the `CR` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `CR` ADD COLUMN `regionalID` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `Regional` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimeRegional` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `ebID` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MembroTime` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `timeID` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CR` ADD CONSTRAINT `CR_regionalID_fkey` FOREIGN KEY (`regionalID`) REFERENCES `Regional`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeRegional` ADD CONSTRAINT `TimeRegional_ebID_fkey` FOREIGN KEY (`ebID`) REFERENCES `EB`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembroTime` ADD CONSTRAINT `MembroTime_timeID_fkey` FOREIGN KEY (`timeID`) REFERENCES `TimeRegional`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
