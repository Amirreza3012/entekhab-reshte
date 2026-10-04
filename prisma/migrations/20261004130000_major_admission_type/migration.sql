-- CreateEnum
CREATE TYPE "AdmissionType" AS ENUM ('REGULAR', 'SERVICE_COMMITMENT', 'NATIVE_COMMITMENT', 'ACADEMIC_RECORD_ONLY', 'FARHANGIAN');

-- AlterTable
ALTER TABLE "Major" ADD COLUMN "admissionType" "AdmissionType" NOT NULL DEFAULT 'REGULAR';

-- CreateIndex
CREATE INDEX "Major_admissionType_idx" ON "Major"("admissionType");
