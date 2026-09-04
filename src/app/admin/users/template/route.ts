import ExcelJS from "exceljs";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";

export async function GET() {
  await requireRole(Role.ADMIN);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("کاربران");
  sheet.views = [{ rightToLeft: true }];

  sheet.columns = [
    { header: "نام و نام خانوادگی", key: "name", width: 28 },
    { header: "ایمیل", key: "email", width: 30 },
    { header: "رمز عبور", key: "password", width: 20 },
    { header: "نقش", key: "role", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  sheet.addRow({
    name: "نمونه دانش‌آموز",
    email: "student.sample@example.com",
    password: "Passw0rd!",
    role: "دانش‌آموز",
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-karbaran.xlsx"',
    },
  });
}
