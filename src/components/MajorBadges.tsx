import type { Major } from "@/generated/prisma/client";
import {
  ADMISSION_METHOD_LABELS,
  ADMISSION_TYPE_LABELS,
  MEHR_1406_ENTRY_YEAR,
  RECORDS_ONLY_BADGE,
  majorTint,
  toPersianDigits,
} from "@/lib/format";

// Admission-type / records-only / mehr-1406 badges, shared by the search
// results table and the choices table. Renders a fragment: the caller owns the
// flex/wrap container.
export function MajorBadges({
  major,
}: {
  major: Pick<Major, "admissionType" | "admissionMethod" | "entryYear">;
}) {
  const tint = majorTint(major.admissionType, major.entryYear);
  return (
    <>
      {tint.badge && (
        <span className={`whitespace-nowrap rounded-md px-2 py-0.5 ${tint.badge}`}>
          {ADMISSION_TYPE_LABELS[major.admissionType]}
        </span>
      )}
      {major.admissionMethod === "RECORDS_ONLY" && (
        <span className={`whitespace-nowrap rounded-md px-2 py-0.5 ${RECORDS_ONLY_BADGE}`}>
          {ADMISSION_METHOD_LABELS.RECORDS_ONLY}
        </span>
      )}
      {major.entryYear === MEHR_1406_ENTRY_YEAR && (
        <span className="whitespace-nowrap rounded-md bg-amber-100 px-2 py-0.5 text-amber-950 ring-1 ring-inset ring-amber-300">
          مهر {toPersianDigits(MEHR_1406_ENTRY_YEAR)}
        </span>
      )}
    </>
  );
}
