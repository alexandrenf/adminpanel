-- CreateTable
CREATE TABLE `NoticiaImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `originalName` VARCHAR(191) NOT NULL,
    `randomString` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `blogId` INTEGER NULL,
    `fileSize` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NoticiaImage_randomString_key`(`randomString`),
    INDEX `NoticiaImage_randomString_idx`(`randomString`),
    INDEX `NoticiaImage_blogId_idx`(`blogId`),
    INDEX `NoticiaImage_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NoticiaImage` ADD CONSTRAINT `NoticiaImage_blogId_fkey` FOREIGN KEY (`blogId`) REFERENCES `Blog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
