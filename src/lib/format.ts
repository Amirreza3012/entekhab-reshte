// format.ts is imported by client components, so use the browser-safe enums
// file: «@/generated/prisma/client» drags the Prisma runtime (node:module)
// into the browser bundle as soon as an enum is used as a value.
import { AdmissionMethod, AdmissionType, Gender, TermType, MentorAction } from "@/generated/prisma/enums";

export const GENDER_LABELS: Record<Gender, string> = {
  FEMALE: "زن",
  MALE: "مرد",
  BOTH: "زن / مرد",
};

export const TERM_LABELS: Record<TermType, string> = {
  FIRST_TERM: "نیمسال اول",
  SECOND_TERM: "نیمسال دوم",
  UNSPECIFIED: "-",
};

// «ورودی» filter on the major search: regular entry vs the mehr-1406 intake.
export const ENTRY_FILTER = { REGULAR: "regular", MEHR_1406: "mehr1406" } as const;

export const ENTRY_FILTER_OPTIONS = [
  { value: "", label: "همه ورودی‌ها" },
  { value: ENTRY_FILTER.REGULAR, label: "ورودی عادی" },
  { value: ENTRY_FILTER.MEHR_1406, label: "مهر ۱۴۰۶" },
];

export const MEHR_1406_ENTRY_YEAR = 1406;

export const ADMISSION_TYPE_LABELS: Record<AdmissionType, string> = {
  REGULAR: "عادی",
  SERVICE_COMMITMENT: "تعهد خدمت",
  NATIVE_COMMITMENT: "تعهد بومی استان",
  FARHANGIAN: "فرهنگیان",
};

// «نوع پذیرش» filter: every type, in booklet order.
export const ADMISSION_TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "همه انواع پذیرش" },
  ...Object.values(AdmissionType).map((t) => ({ value: t, label: ADMISSION_TYPE_LABELS[t] })),
];

export const ADMISSION_METHOD_LABELS: Record<AdmissionMethod, string> = {
  WITH_EXAM: "با آزمون",
  RECORDS_ONLY: "صرفا با سوابق تحصیلی",
};

// «نحوه پذیرش» filter (the booklet's own column).
export const ADMISSION_METHOD_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "همه نحوه‌های پذیرش" },
  ...Object.values(AdmissionMethod).map((m) => ({ value: m, label: ADMISSION_METHOD_LABELS[m] })),
];

// Badge style for «صرفا با سوابق تحصیلی»; it is orthogonal to the row tint.
export const RECORDS_ONLY_BADGE = "bg-rose-800 text-white ring-1 ring-inset ring-rose-900/10";

// Row tint per (admissionType, entryYear). Tailwind needs the full class
// strings, so each variant is spelled out. Cell backgrounds avoid the app's
// global row-hover rule overriding the palette. The RTL edge survives selection.
// Important edge colours override the unlayered global border-colour reset.
export type MajorTint = { key: string; label: string; row: string; swatch: string; badge: string; accent: string };

const TINTS = {
  regular1405: { key: "regular1405", label: "عادی", row: "[&>td]:bg-white [&:hover>td]:bg-slate-50", swatch: "bg-slate-400", accent: "border-r-slate-400!", badge: "" },
  regular1406: { key: "regular1406", label: "عادی — مهر ۱۴۰۶", row: "[&>td]:bg-[#fff4d6] [&:hover>td]:bg-[#ffecc2]", swatch: "bg-amber-600", accent: "border-r-amber-600!", badge: "" },
  service1405: { key: "service1405", label: "تعهد خدمت", row: "[&>td]:bg-[#e6f0ff] [&:hover>td]:bg-[#dce8ff]", swatch: "bg-blue-600", accent: "border-r-blue-600!", badge: "bg-white/80 text-blue-900 ring-1 ring-inset ring-blue-200" },
  service1406: { key: "service1406", label: "تعهد خدمت — مهر ۱۴۰۶", row: "[&>td]:bg-[#eee9ff] [&:hover>td]:bg-[#e4dcff]", swatch: "bg-violet-600", accent: "border-r-violet-600!", badge: "bg-white/80 text-violet-900 ring-1 ring-inset ring-violet-200" },
  native: { key: "native", label: "تعهد بومی استان", row: "[&>td]:bg-[#def5eb] [&:hover>td]:bg-[#d3efe0]", swatch: "bg-emerald-700", accent: "border-r-emerald-700!", badge: "bg-white/80 text-emerald-900 ring-1 ring-inset ring-emerald-200" },
  farhangian: { key: "farhangian", label: "فرهنگیان", row: "[&>td]:bg-[#fae5f4] [&:hover>td]:bg-[#f6d9ed]", swatch: "bg-fuchsia-700", accent: "border-r-fuchsia-700!", badge: "bg-white/80 text-fuchsia-900 ring-1 ring-inset ring-fuchsia-200" },
} satisfies Record<string, MajorTint>;

export const TINT_LEGEND: MajorTint[] = Object.values(TINTS);

export function majorTint(admissionType: AdmissionType, entryYear: number | null): MajorTint {
  const mehr1406 = entryYear === MEHR_1406_ENTRY_YEAR;
  switch (admissionType) {
    case AdmissionType.SERVICE_COMMITMENT:
      return mehr1406 ? TINTS.service1406 : TINTS.service1405;
    case AdmissionType.NATIVE_COMMITMENT:
      return TINTS.native;
    // Farhangian keeps its tint under mehr 1406; only the «مهر ۱۴۰۶» badge is added.
    case AdmissionType.FARHANGIAN:
      return TINTS.farhangian;
    default:
      return mehr1406 ? TINTS.regular1406 : TINTS.regular1405;
  }
}

export const MENTOR_ACTION_LABELS: Record<MentorAction, string> = {
  ADD_CHOICE: "افزودن انتخاب",
  REMOVE_CHOICE: "حذف انتخاب",
  REORDER_CHOICE: "جابجایی انتخاب",
  NOTE: "یادداشت",
};

export function toPersianDigits(value: string | number) {
  const digits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(value).replace(/[0-9]/g, (d) => digits[Number(d)]);
}
