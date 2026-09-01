-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MENTOR', 'STUDENT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'BOTH');

-- CreateEnum
CREATE TYPE "TermType" AS ENUM ('FIRST_TERM', 'SECOND_TERM', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "MentorAction" AS ENUM ('ADD_CHOICE', 'REMOVE_CHOICE', 'REORDER_CHOICE', 'NOTE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "nationalId" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mentorId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Major" (
    "id" TEXT NOT NULL,
    "examYear" INTEGER NOT NULL DEFAULT 1404,
    "fieldGroup" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "university" TEXT NOT NULL,
    "studyPeriod" TEXT NOT NULL,
    "majorCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "capacity" INTEGER,
    "termType" "TermType" NOT NULL DEFAULT 'UNSPECIFIED',
    "gender" "Gender" NOT NULL DEFAULT 'BOTH',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Major_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Choice" (
    "id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "studentId" TEXT NOT NULL,
    "majorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Choice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorLog" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "action" "MentorAction" NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_mentorId_idx" ON "User"("mentorId");

-- CreateIndex
CREATE INDEX "Major_fieldGroup_idx" ON "Major"("fieldGroup");

-- CreateIndex
CREATE INDEX "Major_province_idx" ON "Major"("province");

-- CreateIndex
CREATE INDEX "Major_university_idx" ON "Major"("university");

-- CreateIndex
CREATE INDEX "Major_studyPeriod_idx" ON "Major"("studyPeriod");

-- CreateIndex
CREATE INDEX "Major_gender_idx" ON "Major"("gender");

-- CreateIndex
CREATE INDEX "Major_title_idx" ON "Major"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Major_examYear_majorCode_key" ON "Major"("examYear", "majorCode");

-- CreateIndex
CREATE INDEX "Choice_majorId_idx" ON "Choice"("majorId");

-- CreateIndex
CREATE UNIQUE INDEX "Choice_studentId_rank_key" ON "Choice"("studentId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "Choice_studentId_majorId_key" ON "Choice"("studentId", "majorId");

-- CreateIndex
CREATE INDEX "MentorLog_mentorId_idx" ON "MentorLog"("mentorId");

-- CreateIndex
CREATE INDEX "MentorLog_studentId_idx" ON "MentorLog"("studentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorLog" ADD CONSTRAINT "MentorLog_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorLog" ADD CONSTRAINT "MentorLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
