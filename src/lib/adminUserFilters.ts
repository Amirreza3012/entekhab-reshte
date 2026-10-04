type UserSearchRow = {
  name: string;
  email: string;
  mentorId?: string | null;
  _count?: Record<string, number>;
};

// Match Persian/Arabic keyboard variants and phone-like emails consistently.
export function normalizeUserSearch(value: string) {
  return value.normalize("NFKC").toLowerCase()
    .replace(/ي|ى/g, "ی").replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\u200c\u200d\u064b-\u065f]/g, "")
    .replace(/\s+/g, " ").trim();
}

export function filterAdminUsers<T extends UserSearchRow>(users: T[], filters: {
  query: string;
  mentor?: string;
  choices?: string;
}) {
  const terms = normalizeUserSearch(filters.query).split(" ").filter(Boolean);
  return users.filter((user) => {
    const text = normalizeUserSearch(`${user.name} ${user.email}`);
    if (!terms.every((term) => text.includes(term))) return false;
    if (filters.mentor === "NONE" && user.mentorId) return false;
    if (filters.mentor === "ASSIGNED" && !user.mentorId) return false;
    if (filters.mentor && !["NONE", "ASSIGNED"].includes(filters.mentor) && user.mentorId !== filters.mentor) return false;
    const count = user._count?.choices ?? 0;
    if (filters.choices === "HAS_CHOICES" && count === 0) return false;
    if (filters.choices === "NO_CHOICES" && count > 0) return false;
    return true;
  });
}
