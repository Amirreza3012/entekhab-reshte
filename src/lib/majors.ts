import { prisma } from "@/lib/prisma";
import { AdmissionMethod, AdmissionType, Gender, Prisma } from "@/generated/prisma/client";
import { ENTRY_FILTER, MEHR_1406_ENTRY_YEAR } from "@/lib/format";

export type MajorSearchParams = {
  q?: string;
  fieldGroup?: string;
  province?: string;
  studyPeriod?: string;
  gender?: string;
  entryYear?: string;
  admissionType?: string;
  admissionMethod?: string;
  page?: number;
};

export const PAGE_SIZE = 25;

// Faceted filters: each list only offers values that exist given every *other*
// active filter (so picking the mehr-1406 entry narrows provinces, fields and
// study periods to that entry). A list ignores its own value so it can still be
// switched, and the free-text query so typing never empties the dropdowns.
export async function getMajorFilterOptions(params: MajorSearchParams = {}) {
  const base: MajorSearchParams = { ...params, q: undefined, page: undefined };
  const withSelected = (values: string[], selected?: string) =>
    selected && !values.includes(selected) ? [...values, selected] : values;

  const [fieldGroups, provinces, studyPeriods] = await Promise.all([
    prisma.major.findMany({
      where: buildWhere({ ...base, fieldGroup: undefined }),
      distinct: ["fieldGroup"],
      select: { fieldGroup: true },
      orderBy: { fieldGroup: "asc" },
    }),
    prisma.major.findMany({
      where: buildWhere({ ...base, province: undefined }),
      distinct: ["province"],
      select: { province: true },
      orderBy: { province: "asc" },
    }),
    prisma.major.findMany({
      where: buildWhere({ ...base, studyPeriod: undefined }),
      distinct: ["studyPeriod"],
      select: { studyPeriod: true },
      orderBy: { studyPeriod: "asc" },
    }),
  ]);

  return {
    fieldGroups: withSelected(fieldGroups.map((f) => f.fieldGroup), params.fieldGroup),
    provinces: withSelected(provinces.map((p) => p.province), params.province),
    studyPeriods: withSelected(studyPeriods.map((s) => s.studyPeriod), params.studyPeriod),
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

  if (params.entryYear === ENTRY_FILTER.MEHR_1406) where.entryYear = MEHR_1406_ENTRY_YEAR;
  else if (params.entryYear === ENTRY_FILTER.REGULAR) where.entryYear = null;

  // Only the five known enum values filter; anything else is ignored.
  if (params.admissionType && (Object.values(AdmissionType) as string[]).includes(params.admissionType)) {
    where.admissionType = params.admissionType as AdmissionType;
  }
  if (params.admissionMethod && (Object.values(AdmissionMethod) as string[]).includes(params.admissionMethod)) {
    where.admissionMethod = params.admissionMethod as AdmissionMethod;
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
