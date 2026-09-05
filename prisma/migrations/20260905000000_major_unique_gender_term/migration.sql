-- DropIndex
DROP INDEX "Major_examYear_majorCode_key";

-- CreateIndex
CREATE UNIQUE INDEX "Major_examYear_majorCode_gender_termType_key" ON "Major"("examYear", "majorCode", "gender", "termType");
