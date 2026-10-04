-- CreateEnum
CREATE TYPE "AdmissionMethod" AS ENUM ('WITH_EXAM', 'RECORDS_ONLY');

-- AlterTable
ALTER TABLE "Major" ADD COLUMN "admissionMethod" "AdmissionMethod" NOT NULL DEFAULT 'WITH_EXAM';

-- CreateIndex
CREATE INDEX "Major_admissionMethod_idx" ON "Major"("admissionMethod");

-- «صرفا با سوابق تحصیلی» is now stored in admissionMethod, so drop it from AdmissionType.
UPDATE "Major" SET "admissionType" = 'REGULAR' WHERE "admissionType" = 'ACADEMIC_RECORD_ONLY';
ALTER TYPE "AdmissionType" RENAME TO "AdmissionType_old";
CREATE TYPE "AdmissionType" AS ENUM ('REGULAR', 'SERVICE_COMMITMENT', 'NATIVE_COMMITMENT', 'FARHANGIAN');
ALTER TABLE "Major" ALTER COLUMN "admissionType" DROP DEFAULT;
ALTER TABLE "Major" ALTER COLUMN "admissionType" TYPE "AdmissionType" USING ("admissionType"::text::"AdmissionType");
ALTER TABLE "Major" ALTER COLUMN "admissionType" SET DEFAULT 'REGULAR';
DROP TYPE "AdmissionType_old";
