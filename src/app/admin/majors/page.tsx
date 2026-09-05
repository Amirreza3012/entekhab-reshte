import { prisma } from "@/lib/prisma";
import { BulkCreateMajorsForm } from "@/components/BulkCreateMajorsForm";
import { toPersianDigits } from "@/lib/format";
import { PageHero } from "@/components/PageHero";

export default async function AdminMajorsPage() {
  const total = await prisma.major.count();

  return (
    <div className="flex flex-col gap-4">
      <PageHero eyebrow="بانک اطلاعاتی" title="مدیریت رشته‌ها" description="فایل رشته‌محل‌ها را یکجا وارد و داده‌های سامانه را به‌روز نگه دارید." aside={<span className="rounded-xl bg-[#dfff4f] px-4 py-2.5 text-xs font-black text-slate-950">
          {toPersianDigits(total)} رشته‌محل ثبت‌شده
        </span>} />

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-slate-800">
          افزودن گروهی رشته‌ها از اکسل
        </h2>
        <BulkCreateMajorsForm />
      </section>
    </div>
  );
}
