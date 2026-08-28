ALTER TYPE "EmailEventType" ADD VALUE IF NOT EXISTS 'PARENT_PORTAL_ACTIVATION';

CREATE TABLE "ParentAccessToken" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentAccessToken_tokenHash_key" ON "ParentAccessToken"("tokenHash");
CREATE INDEX "ParentAccessToken_email_idx" ON "ParentAccessToken"("email");
CREATE INDEX "ParentAccessToken_expiresAt_idx" ON "ParentAccessToken"("expiresAt");
CREATE INDEX "ParentAccessToken_usedAt_idx" ON "ParentAccessToken"("usedAt");
