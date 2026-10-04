-- AlterTable
ALTER TABLE "Major" ADD COLUMN "entryYear" INTEGER;

-- CreateIndex
CREATE INDEX "Major_entryYear_idx" ON "Major"("entryYear");
