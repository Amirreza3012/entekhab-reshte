import { Gender, TermType, MentorAction } from "@/generated/prisma/client";

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
