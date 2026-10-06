export const CHOICES_PAGE_SIZE = 10;
export const CHOICES_PAGE_PARAM = "choicesPage";

// One page of a student's list. The page is clamped, so removing the last row
// of the last page lands on the new last page instead of an empty table.
export function paginateChoices<T>(choices: T[], pageParam?: string) {
  const pageCount = Math.max(1, Math.ceil(choices.length / CHOICES_PAGE_SIZE));
  const requested = Number(pageParam);
  const page = Math.min(pageCount, Math.max(1, Number.isInteger(requested) ? requested : 1));
  return {
    page,
    pageCount,
    items: choices.slice((page - 1) * CHOICES_PAGE_SIZE, page * CHOICES_PAGE_SIZE),
  };
}

// Link to another page of the list that keeps every other query parameter
// (the major search on the same screen stays as it is).
export function choicesPageHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  page: number
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string" && value && key !== CHOICES_PAGE_PARAM) params.set(key, value);
  }
  params.set(CHOICES_PAGE_PARAM, String(page));
  return `${basePath}?${params.toString()}`;
}
