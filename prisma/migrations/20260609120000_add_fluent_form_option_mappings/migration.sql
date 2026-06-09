-- CreateTable
CREATE TABLE "FluentFormOptionMapping" (
    "id" TEXT NOT NULL,
    "formMappingId" TEXT NOT NULL,
    "sourceOptionText" TEXT NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FluentFormOptionMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FluentFormOptionMapping_formMappingId_sourceOptionText_key" ON "FluentFormOptionMapping"("formMappingId", "sourceOptionText");

-- CreateIndex
CREATE INDEX "FluentFormOptionMapping_formMappingId_idx" ON "FluentFormOptionMapping"("formMappingId");

-- CreateIndex
CREATE INDEX "FluentFormOptionMapping_batchNumber_idx" ON "FluentFormOptionMapping"("batchNumber");

-- CreateIndex
CREATE INDEX "FluentFormOptionMapping_isActive_idx" ON "FluentFormOptionMapping"("isActive");

-- AddForeignKey
ALTER TABLE "FluentFormOptionMapping" ADD CONSTRAINT "FluentFormOptionMapping_formMappingId_fkey" FOREIGN KEY ("formMappingId") REFERENCES "FluentFormMapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;
