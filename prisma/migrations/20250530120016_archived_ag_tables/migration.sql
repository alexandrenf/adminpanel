-- CreateTable
CREATE TABLE `ArchivedAssembly` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `originalStatus` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `lastUpdated` DATETIME(3) NOT NULL,
    `lastUpdatedBy` VARCHAR(191) NOT NULL,
    `registrationOpen` BOOLEAN NOT NULL,
    `registrationDeadline` DATETIME(3) NULL,
    `maxParticipants` INTEGER NULL,
    `description` VARCHAR(191) NULL,
    `paymentRequired` BOOLEAN NULL,
    `archivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `archivedBy` VARCHAR(191) NOT NULL,

    INDEX `ArchivedAssembly_name_idx`(`name`),
    INDEX `ArchivedAssembly_archivedAt_idx`(`archivedAt`),
    INDEX `ArchivedAssembly_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArchivedAGParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `assemblyId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `escola` VARCHAR(191) NULL,
    `regional` VARCHAR(191) NULL,
    `cidade` VARCHAR(191) NULL,
    `uf` VARCHAR(191) NULL,
    `agFiliacao` VARCHAR(191) NULL,
    `addedAt` DATETIME(3) NOT NULL,
    `addedBy` VARCHAR(191) NOT NULL,

    INDEX `ArchivedAGParticipant_assemblyId_idx`(`assemblyId`),
    INDEX `ArchivedAGParticipant_participantId_idx`(`participantId`),
    INDEX `ArchivedAGParticipant_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArchivedRegistrationModality` (
    `id` VARCHAR(191) NOT NULL,
    `assemblyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` INTEGER NOT NULL,
    `maxParticipants` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL,
    `displayOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,

    INDEX `ArchivedRegistrationModality_assemblyId_idx`(`assemblyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArchivedAGRegistration` (
    `id` VARCHAR(191) NOT NULL,
    `assemblyId` VARCHAR(191) NOT NULL,
    `modalityId` VARCHAR(191) NULL,
    `participantType` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `participantName` VARCHAR(191) NOT NULL,
    `participantRole` VARCHAR(191) NULL,
    `participantStatus` VARCHAR(191) NULL,
    `registeredAt` DATETIME(3) NOT NULL,
    `registeredBy` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `escola` VARCHAR(191) NULL,
    `regional` VARCHAR(191) NULL,
    `cidade` VARCHAR(191) NULL,
    `uf` VARCHAR(191) NULL,
    `agFiliacao` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `specialNeeds` VARCHAR(191) NULL,
    `emailSolar` VARCHAR(191) NULL,
    `dataNascimento` VARCHAR(191) NULL,
    `cpf` VARCHAR(191) NULL,
    `nomeCracha` VARCHAR(191) NULL,
    `celular` VARCHAR(191) NULL,
    `comiteLocal` VARCHAR(191) NULL,
    `comiteAspirante` VARCHAR(191) NULL,
    `autorizacaoCompartilhamento` BOOLEAN NULL,
    `experienciaAnterior` VARCHAR(191) NULL,
    `motivacao` VARCHAR(191) NULL,
    `expectativas` VARCHAR(191) NULL,
    `dietaRestricoes` VARCHAR(191) NULL,
    `alergias` VARCHAR(191) NULL,
    `medicamentos` VARCHAR(191) NULL,
    `necessidadesEspeciais` VARCHAR(191) NULL,
    `restricaoQuarto` VARCHAR(191) NULL,
    `pronomes` VARCHAR(191) NULL,
    `contatoEmergenciaNome` VARCHAR(191) NULL,
    `contatoEmergenciaTelefone` VARCHAR(191) NULL,
    `outrasObservacoes` VARCHAR(191) NULL,
    `participacaoComites` VARCHAR(191) NULL,
    `interesseVoluntariado` BOOLEAN NULL,
    `isPaymentExempt` BOOLEAN NULL,
    `paymentExemptReason` VARCHAR(191) NULL,
    `receiptFileName` VARCHAR(191) NULL,
    `receiptFileType` VARCHAR(191) NULL,
    `receiptFileSize` INTEGER NULL,
    `receiptFileData` LONGTEXT NULL,
    `receiptUploadedAt` DATETIME(3) NULL,
    `receiptUploadedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewNotes` VARCHAR(191) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `resubmittedAt` DATETIME(3) NULL,
    `resubmissionNote` VARCHAR(191) NULL,

    INDEX `ArchivedAGRegistration_assemblyId_idx`(`assemblyId`),
    INDEX `ArchivedAGRegistration_participantId_idx`(`participantId`),
    INDEX `ArchivedAGRegistration_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArchivedAGConfig` (
    `id` VARCHAR(191) NOT NULL,
    `assemblyId` VARCHAR(191) NOT NULL,
    `codeOfConductUrl` VARCHAR(191) NULL,
    `paymentInfo` VARCHAR(191) NULL,
    `paymentInstructions` VARCHAR(191) NULL,
    `bankDetails` VARCHAR(191) NULL,
    `pixKey` VARCHAR(191) NULL,
    `registrationEnabled` BOOLEAN NOT NULL,
    `autoApproval` BOOLEAN NOT NULL,
    `originalCreatedAt` DATETIME(3) NOT NULL,
    `originalUpdatedAt` DATETIME(3) NOT NULL,
    `originalUpdatedBy` VARCHAR(191) NOT NULL,
    `archivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ArchivedAGConfig_assemblyId_key`(`assemblyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ArchivedAssembly` ADD CONSTRAINT `ArchivedAssembly_archivedBy_fkey` FOREIGN KEY (`archivedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchivedAGParticipant` ADD CONSTRAINT `ArchivedAGParticipant_assemblyId_fkey` FOREIGN KEY (`assemblyId`) REFERENCES `ArchivedAssembly`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchivedRegistrationModality` ADD CONSTRAINT `ArchivedRegistrationModality_assemblyId_fkey` FOREIGN KEY (`assemblyId`) REFERENCES `ArchivedAssembly`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchivedAGRegistration` ADD CONSTRAINT `ArchivedAGRegistration_assemblyId_fkey` FOREIGN KEY (`assemblyId`) REFERENCES `ArchivedAssembly`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchivedAGRegistration` ADD CONSTRAINT `ArchivedAGRegistration_modalityId_fkey` FOREIGN KEY (`modalityId`) REFERENCES `ArchivedRegistrationModality`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchivedAGConfig` ADD CONSTRAINT `ArchivedAGConfig_assemblyId_fkey` FOREIGN KEY (`assemblyId`) REFERENCES `ArchivedAssembly`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
