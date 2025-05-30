/*
  Warnings:

  - You are about to drop the `ArchivedAGConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ArchivedAGParticipant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ArchivedAGRegistration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ArchivedAssembly` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ArchivedRegistrationModality` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `ArchivedAGConfig` DROP FOREIGN KEY `ArchivedAGConfig_assemblyId_fkey`;

-- DropForeignKey
ALTER TABLE `ArchivedAGParticipant` DROP FOREIGN KEY `ArchivedAGParticipant_assemblyId_fkey`;

-- DropForeignKey
ALTER TABLE `ArchivedAGRegistration` DROP FOREIGN KEY `ArchivedAGRegistration_assemblyId_fkey`;

-- DropForeignKey
ALTER TABLE `ArchivedAGRegistration` DROP FOREIGN KEY `ArchivedAGRegistration_modalityId_fkey`;

-- DropForeignKey
ALTER TABLE `ArchivedAssembly` DROP FOREIGN KEY `ArchivedAssembly_archivedBy_fkey`;

-- DropForeignKey
ALTER TABLE `ArchivedRegistrationModality` DROP FOREIGN KEY `ArchivedRegistrationModality_assemblyId_fkey`;

-- DropTable
DROP TABLE `ArchivedAGConfig`;

-- DropTable
DROP TABLE `ArchivedAGParticipant`;

-- DropTable
DROP TABLE `ArchivedAGRegistration`;

-- DropTable
DROP TABLE `ArchivedAssembly`;

-- DropTable
DROP TABLE `ArchivedRegistrationModality`;
