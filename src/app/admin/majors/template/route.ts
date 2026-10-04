import ExcelJS from "exceljs";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";

export async function GET() {
  await requireRole(Role.ADMIN);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("رشته‌ها");
  sheet.views = [{ rightToLeft: true }];

  sheet.columns = [
    { header: "سال کنکور", key: "examYear", width: 12 },
    { header: "گروه آزمایشی", key: "fieldGroup", width: 16 },
    { header: "استان", key: "province", width: 16 },
    { header: "دانشگاه", key: "university", width: 32 },
    { header: "دوره تحصیلی", key: "studyPeriod", width: 16 },
    { header: "کدرشته محل", key: "majorCode", width: 14 },
    { header: "عنوان رشته", key: "title", width: 28 },
    { header: "ظرفیت", key: "capacity", width: 10 },
    { header: "نیمسال", key: "termType", width: 12 },
    { header: "جنسیت", key: "gender", width: 10 },
    { header: "توضیحات", key: "description", width: 30 },
    { header: "سال ورود", key: "entryYear", width: 10 }, // اختیاری؛ برای ورودی مهر ۱۴۰۶: 1406
    { header: "نوع پذیرش", key: "admissionType", width: 18 }, // عادی / تعهد خدمت / تعهد بومی استان / فرهنگیان
    { header: "نحوه پذیرش", key: "admissionMethod", width: 22 }, // با آزمون / صرفا با سوابق تحصیلی
  ];
  sheet.getRow(1).font = { bold: true };

  sheet.addRow({
    examYear: 1404,
    fieldGroup: "علوم تجربی",
    province: "آذربایجان شرقی",
    university: "دانشگاه علوم پزشکی تبریز",
    studyPeriod: "روزانه",
    majorCode: "31810",
    title: "پرستاری",
    capacity: 21,
    termType: "اول",
    gender: "مرد",
    description: "",
    admissionType: "عادی",
    admissionMethod: "با آزمون",
  });
  sheet.addRow({
    examYear: 1404,
    fieldGroup: "علوم تجربی",
    province: "آذربایجان شرقی",
    university: "دانشگاه علوم پزشکی تبریز",
    studyPeriod: "روزانه",
    majorCode: "31810",
    title: "پرستاری",
    capacity: 21,
    termType: "اول",
    gender: "زن",
    description: "",
    admissionType: "عادی",
    admissionMethod: "با آزمون",
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-reshteha.xlsx"',
    },
  });
}
