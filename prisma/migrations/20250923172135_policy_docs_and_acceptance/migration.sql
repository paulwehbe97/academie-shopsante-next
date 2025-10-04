-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastReminderAt" DATETIME;

-- CreateTable
CREATE TABLE "RevokedInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "InviteLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Employé',
    "storeCode" TEXT NOT NULL,
    "storeName" TEXT,
    "invitedBy" TEXT,
    "invitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "acceptedAt" DATETIME
);

-- CreateTable
CREATE TABLE "PolicyDoc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Politique',
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PolicyAcceptance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "acceptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "PolicyAcceptance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PolicyDoc" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PolicyAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RevokedInvite_added_idx" ON "RevokedInvite"("added");

-- CreateIndex
CREATE UNIQUE INDEX "InviteLog_jti_key" ON "InviteLog"("jti");

-- CreateIndex
CREATE INDEX "InviteLog_storeCode_invitedAt_idx" ON "InviteLog"("storeCode", "invitedAt");

-- CreateIndex
CREATE INDEX "InviteLog_email_invitedAt_idx" ON "InviteLog"("email", "invitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyDoc_fileKey_key" ON "PolicyDoc"("fileKey");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcceptance_policyId_userId_key" ON "PolicyAcceptance"("policyId", "userId");
