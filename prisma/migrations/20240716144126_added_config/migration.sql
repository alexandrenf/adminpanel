-- CreateTable
CREATE TABLE `Config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `toggleDate` BOOLEAN NULL,
    `dateStart` DATETIME(3) NULL,
    `dateEnd` DATETIME(3) NULL,
    `toggleMessage` BOOLEAN NULL,
    `message` VARCHAR(191) NULL,
    `toggleButton` BOOLEAN NULL,
    `buttonText` VARCHAR(191) NULL,
    `buttonUrl` VARCHAR(191) NULL,
    `toggleColor` BOOLEAN NULL,
    `color` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
