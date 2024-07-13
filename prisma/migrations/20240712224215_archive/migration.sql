-- CreateTable
CREATE TABLE `Gestao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `yearStart` INTEGER NOT NULL,
    `yearEnd` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Arquivado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `acronym` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `imageLink` VARCHAR(191) NULL,
    `gestaoId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Arquivado` ADD CONSTRAINT `Arquivado_gestaoId_fkey` FOREIGN KEY (`gestaoId`) REFERENCES `Gestao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
