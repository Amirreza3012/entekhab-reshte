import { prisma } from "@/lib/prisma";
import { BulkCreateMajorsForm } from "@/components/BulkCreateMajorsForm";
import { EditableMajorsTable } from "@/components/EditableMajorsTable";
import { MajorFilters } from "@/components/MajorFilters";
import { MajorTintLegend } from "@/components/MajorTintLegend";
import { Pagination } from "@/components/Pagination";
import { toPersianDigits } from "@/lib/format";
import { getMajorFilterOptions, searchMajors } from "@/lib/majors";
import { PageHero } from "@/components/PageHero";

type SearchParams = Record<string, string | undefined>;

export default async function AdminMajorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const filters = {
    fieldGroup: sp.fieldGroup,
    province: sp.province,
    studyPeriod: sp.studyPeriod,
    gender: sp.gender,
    entryYear: sp.entryYear,
    admissionType: sp.admissionType,
    admissionMethod: sp.admissionMethod,
  };
  const [total, options, results] = await Promise.all([
    prisma.major.count(),
    getMajorFilterOptions(filters),
    searchMajors({
      q: sp.q,
      ...filters,
      page: sp.page ? Number(sp.page) : 1,
      sort: sp.sort,
      sortDirection: sp.sortDirection,
    }),
  ]);

  const buildHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (typeof value === "string" && value && key !== "page") params.set(key, value);
    }
    params.set("page", String(page));
    return `/admin/majors?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHero eyebrow="بانک اطلاعاتی" title="مدیریت رشته‌ها" description="فایل رشته‌محل‌ها را یکجا وارد کنید و در صورت اصلاحیه‌ی سازمان سنجش، رشته‌ها را در جدول ویرایش کنید." aside={<span className="rounded-xl bg-[#dfff4f] px-4 py-2.5 text-xs font-black text-slate-950">
          {toPersianDigits(total)} رشته‌محل ثبت‌شده
        </span>} />

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-slate-800">
          افزودن گروهی رشته‌ها از اکسل
        </h2>
        <BulkCreateMajorsForm />
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <h2 className="font-semibold text-slate-800">ویرایش رشته‌ها</h2>
        <MajorFilters
          action="/admin/majors"
          options={options}
          defaults={{ q: sp.q, ...filters, sort: sp.sort, sortDirection: sp.sortDirection }}
        />
        <p className="text-sm text-slate-500">
          {toPersianDigits(results.total)} رشته یافت شد
        </p>
        <MajorTintLegend />
        <EditableMajorsTable items={results.items} basePath="/admin/majors" searchParams={sp} />
        <Pagination page={results.page} pageCount={results.pageCount} buildHref={buildHref} />
      </section>
    </div>
  );
}
