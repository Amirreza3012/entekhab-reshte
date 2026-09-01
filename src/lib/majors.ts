import { prisma } from "@/lib/prisma";
import { Gender, Prisma } from "@/generated/prisma/client";

export type MajorSearchParams = {
  q?: string;
  fieldGroup?: string;
  province?: string;
  studyPeriod?: string;
  gender?: string;
  page?: number;
};

export const PAGE_SIZE = 25;

export async function getMajorFilterOptions() {
  const [fieldGroups, provinces, studyPeriods] = await Promise.all([
    prisma.major.findMany({
      distinct: ["fieldGroup"],
      select: { fieldGroup: true },
      orderBy: { fieldGroup: "asc" },
    }),
    prisma.major.findMany({
      distinct: ["province"],
      select: { province: true },
      orderBy: { province: "asc" },
    }),
    prisma.major.findMany({
      distinct: ["studyPeriod"],
      select: { studyPeriod: true },
      orderBy: { studyPeriod: "asc" },
    }),
  ]);

  return {
    fieldGroups: fieldGroups.map((f) => f.fieldGroup),
    provinces: provinces.map((p) => p.province),
    studyPeriods: studyPeriods.map((s) => s.studyPeriod),
  };
}

function buildWhere(params: MajorSearchParams): Prisma.MajorWhereInput {
  const where: Prisma.MajorWhereInput = {};

  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { university: { contains: params.q, mode: "insensitive" } },
      { majorCode: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.fieldGroup) where.fieldGroup = params.fieldGroup;
  if (params.province) where.province = params.province;
  if (params.studyPeriod) where.studyPeriod = params.studyPeriod;
  if (params.gender && params.gender !== "ANY") {
    where.gender = { in: [params.gender as Gender, Gender.BOTH] };
  }

  return where;
}

export async function searchMajors(params: MajorSearchParams) {
  const where = buildWhere(params);
  const page = Math.max(1, params.page ?? 1);

  const [items, total] = await Promise.all([
    prisma.major.findMany({
      where,
      orderBy: [{ fieldGroup: "asc" }, { province: "asc" }, { university: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.major.count({ where }),
  ]);

  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
