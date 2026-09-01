import "dotenv/config";
import { PrismaClient, Gender, TermType, Role } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type MajorSeed = {
  fieldGroup: string;
  province: string;
  university: string;
  studyPeriod: string;
  majorCode: string;
  title: string;
  capacity: number;
  termType: TermType;
  gender: Gender;
  description?: string;
};

// نمونه داده‌ی آزمایشی برای تست رابط کاربری، برگرفته از دفترچه نمونه.
// جایگزینی با فایل رسمی سازمان سنجش پس از آماده شدن importer نهایی انجام می‌شود.
const majors: MajorSeed[] = [
  { fieldGroup: "پزشکی", province: "آذربایجان شرقی", university: "دانشگاه علوم پزشکی تبریز", studyPeriod: "روزانه", majorCode: "31801", title: "دکتری عمومی پزشکی", capacity: 110, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "پزشکی", province: "آذربایجان شرقی", university: "دانشگاه علوم پزشکی تبریز - شهریه‌پرداز", studyPeriod: "شهریه پردار", majorCode: "31839", title: "دکتری عمومی پزشکی", capacity: 19, termType: TermType.FIRST_TERM, gender: Gender.MALE },
  { fieldGroup: "پزشکی", province: "آذربایجان شرقی", university: "دانشگاه علوم پزشکی تبریز (محل تحصیل دانشکده علوم پزشکی مراغه)", studyPeriod: "روزانه", majorCode: "31867", title: "دکتری عمومی پزشکی", capacity: 29, termType: TermType.FIRST_TERM, gender: Gender.BOTH, description: "عدم تعهد در واگذاری خوابگاه" },
  { fieldGroup: "پزشکی", province: "آذربایجان غربی", university: "دانشگاه علوم پزشکی ارومیه", studyPeriod: "روزانه", majorCode: "31903", title: "دکتری عمومی پزشکی", capacity: 62, termType: TermType.FIRST_TERM, gender: Gender.BOTH, description: "عدم تعهد در واگذاری خوابگاه" },
  { fieldGroup: "پزشکی", province: "اردبیل", university: "دانشگاه علوم پزشکی اردبیل", studyPeriod: "روزانه", majorCode: "31967", title: "دکتری عمومی پزشکی", capacity: 48, termType: TermType.FIRST_TERM, gender: Gender.BOTH, description: "فاقد خوابگاه" },
  { fieldGroup: "پزشکی", province: "اصفهان", university: "دانشگاه علوم پزشکی اصفهان", studyPeriod: "روزانه", majorCode: "32011", title: "دکتری عمومی پزشکی", capacity: 100, termType: TermType.FIRST_TERM, gender: Gender.BOTH, description: "محدودیت در ارائه خوابگاه" },
  { fieldGroup: "پزشکی", province: "تهران", university: "دانشگاه علوم پزشکی تهران", studyPeriod: "روزانه", majorCode: "32273", title: "دکتری عمومی پزشکی", capacity: 128, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "پزشکی", province: "تهران", university: "دانشگاه علوم پزشکی شهید بهشتی", studyPeriod: "روزانه", majorCode: "32364", title: "دکتری عمومی پزشکی", capacity: 113, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "پزشکی", province: "تهران", university: "دانشگاه آزاد اسلامی واحد تهران پزشکی", studyPeriod: "آزاد تمام وقت", majorCode: "32437", title: "دکتری عمومی پزشکی", capacity: 160, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "پزشکی", province: "خراسان رضوی", university: "دانشگاه علوم پزشکی مشهد", studyPeriod: "روزانه", majorCode: "32634", title: "دکتری عمومی پزشکی", capacity: 97, termType: TermType.FIRST_TERM, gender: Gender.BOTH, description: "عدم تعهد در واگذاری خوابگاه" },
  { fieldGroup: "پزشکی", province: "خراسان رضوی", university: "دانشگاه علوم پزشکی نیشابور", studyPeriod: "روزانه", majorCode: "32698", title: "دکتری عمومی پزشکی", capacity: 28, termType: TermType.FIRST_TERM, gender: Gender.BOTH, description: "عدم تعهد در واگذاری خوابگاه" },
  { fieldGroup: "پزشکی", province: "فارس", university: "دانشگاه علوم پزشکی شیراز", studyPeriod: "روزانه", majorCode: "33210", title: "دکتری عمومی پزشکی", capacity: 105, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "پزشکی", province: "خوزستان", university: "دانشگاه علوم پزشکی جندی‌شاپور اهواز", studyPeriod: "روزانه", majorCode: "33540", title: "دکتری عمومی پزشکی", capacity: 90, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "پزشکی", province: "مازندران", university: "دانشگاه علوم پزشکی مازندران (ساری)", studyPeriod: "روزانه", majorCode: "34012", title: "دکتری عمومی پزشکی", capacity: 66, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "پزشکی", province: "گیلان", university: "دانشگاه علوم پزشکی گیلان (رشت)", studyPeriod: "روزانه", majorCode: "34188", title: "دکتری عمومی پزشکی", capacity: 70, termType: TermType.FIRST_TERM, gender: Gender.BOTH },

  { fieldGroup: "دندان‌پزشکی", province: "تهران", university: "دانشگاه علوم پزشکی تهران", studyPeriod: "روزانه", majorCode: "35012", title: "دکتری دندان‌پزشکی", capacity: 45, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "دندان‌پزشکی", province: "تهران", university: "دانشگاه علوم پزشکی شهید بهشتی", studyPeriod: "روزانه", majorCode: "35045", title: "دکتری دندان‌پزشکی", capacity: 40, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "دندان‌پزشکی", province: "اصفهان", university: "دانشگاه علوم پزشکی اصفهان", studyPeriod: "روزانه", majorCode: "35110", title: "دکتری دندان‌پزشکی", capacity: 35, termType: TermType.FIRST_TERM, gender: Gender.BOTH, description: "محدودیت در ارائه خوابگاه" },
  { fieldGroup: "دندان‌پزشکی", province: "فارس", university: "دانشگاه علوم پزشکی شیراز", studyPeriod: "روزانه", majorCode: "35201", title: "دکتری دندان‌پزشکی", capacity: 38, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "دندان‌پزشکی", province: "خراسان رضوی", university: "دانشگاه علوم پزشکی مشهد", studyPeriod: "روزانه", majorCode: "35267", title: "دکتری دندان‌پزشکی", capacity: 32, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "دندان‌پزشکی", province: "تهران", university: "دانشگاه آزاد اسلامی واحد تهران پزشکی", studyPeriod: "آزاد تمام وقت", majorCode: "35310", title: "دکتری دندان‌پزشکی", capacity: 60, termType: TermType.FIRST_TERM, gender: Gender.BOTH },

  { fieldGroup: "داروسازی", province: "تهران", university: "دانشگاه علوم پزشکی تهران", studyPeriod: "روزانه", majorCode: "36012", title: "دکتری داروسازی", capacity: 50, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "داروسازی", province: "اصفهان", university: "دانشگاه علوم پزشکی اصفهان", studyPeriod: "روزانه", majorCode: "36088", title: "دکتری داروسازی", capacity: 40, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "داروسازی", province: "فارس", university: "دانشگاه علوم پزشکی شیراز", studyPeriod: "روزانه", majorCode: "36145", title: "دکتری داروسازی", capacity: 42, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "داروسازی", province: "آذربایجان شرقی", university: "دانشگاه علوم پزشکی تبریز", studyPeriod: "روزانه", majorCode: "36201", title: "دکتری داروسازی", capacity: 30, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "داروسازی", province: "خراسان رضوی", university: "دانشگاه علوم پزشکی مشهد", studyPeriod: "روزانه", majorCode: "36255", title: "دکتری داروسازی", capacity: 35, termType: TermType.FIRST_TERM, gender: Gender.BOTH },

  { fieldGroup: "پرستاری", province: "تهران", university: "دانشگاه علوم پزشکی تهران", studyPeriod: "روزانه", majorCode: "37010", title: "کارشناسی پرستاری", capacity: 80, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "پرستاری", province: "تهران", university: "دانشگاه علوم پزشکی ایران", studyPeriod: "شبانه", majorCode: "37033", title: "کارشناسی پرستاری", capacity: 45, termType: TermType.SECOND_TERM, gender: Gender.FEMALE },
  { fieldGroup: "پرستاری", province: "اصفهان", university: "دانشگاه علوم پزشکی اصفهان", studyPeriod: "روزانه", majorCode: "37098", title: "کارشناسی پرستاری", capacity: 60, termType: TermType.FIRST_TERM, gender: Gender.BOTH },
  { fieldGroup: "پرستاری", province: "گیلان", university: "دانشگاه علوم پزشکی گیلان (رشت)", studyPeriod: "روزانه", majorCode: "37150", title: "کارشناسی پرستاری", capacity: 55, termType: TermType.FIRST_TERM, gender: Gender.MALE },
  { fieldGroup: "پرستاری", province: "خراسان رضوی", university: "دانشگاه علوم پزشکی مشهد", studyPeriod: "روزانه", majorCode: "37188", title: "کارشناسی پرستاری", capacity: 65, termType: TermType.FIRST_TERM, gender: Gender.BOTH },

  { fieldGroup: "مامایی", province: "تهران", university: "دانشگاه علوم پزشکی شهید بهشتی", studyPeriod: "روزانه", majorCode: "38014", title: "کارشناسی مامایی", capacity: 30, termType: TermType.FIRST_TERM, gender: Gender.FEMALE },
  { fieldGroup: "مامایی", province: "اصفهان", university: "دانشگاه علوم پزشکی اصفهان", studyPeriod: "روزانه", majorCode: "38077", title: "کارشناسی مامایی", capacity: 25, termType: TermType.FIRST_TERM, gender: Gender.FEMALE },
  { fieldGroup: "مامایی", province: "فارس", university: "دانشگاه علوم پزشکی شیراز", studyPeriod: "روزانه", majorCode: "38102", title: "کارشناسی مامایی", capacity: 28, termType: TermType.FIRST_TERM, gender: Gender.FEMALE },
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Passw0rd!";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const demoPasswordHash = await bcrypt.hash("Passw0rd!", 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      name: "مدیر سامانه",
      role: Role.ADMIN,
    },
  });

  const mentor = await prisma.user.upsert({
    where: { email: "mentor@example.com" },
    update: {},
    create: {
      email: "mentor@example.com",
      passwordHash: demoPasswordHash,
      name: "منتور نمونه",
      role: Role.MENTOR,
    },
  });

  await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      email: "student@example.com",
      passwordHash: demoPasswordHash,
      name: "دانش‌آموز نمونه",
      role: Role.STUDENT,
      mentorId: mentor.id,
    },
  });

  for (const m of majors) {
    await prisma.major.upsert({
      where: { examYear_majorCode: { examYear: 1404, majorCode: m.majorCode } },
      update: {},
      create: { examYear: 1404, ...m },
    });
  }

  console.log("Seed completed.");
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`Mentor (demo): mentor@example.com / Passw0rd!`);
  console.log(`Student (demo): student@example.com / Passw0rd!`);
  console.log(`Created admin id: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
