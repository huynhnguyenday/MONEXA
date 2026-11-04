function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('vi')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Shared search rule: LIKE %query%, ignoring case, Vietnamese accents and extra spaces.
 * User input is literal text, not a SQL pattern or regular expression.
 */
export function createSearchMatcher(query: string) {
  const needle = normalizeSearch(query);
  return (value: string) => !needle || normalizeSearch(value).includes(needle);
}

/** A numeric query searches VND values within an inclusive ±20,000 range.
 * Other queries use the shared LIKE name search. Hidden fields are never searched.
 */
export function createNameAmountSearchMatcher(query: string) {
  const input = query
    .trim()
    .replace(/\s*(?:vnd|vnđ|đ|₫)$/iu, '')
    .trim();
  const numeric = /^(?:\d+|\d{1,3}(?:[.,\s]\d{3})+)$/.test(input);
  const target = numeric ? Number(input.replace(/[.,\s]/g, '')) : NaN;
  if (Number.isSafeInteger(target)) {
    return (item: { title: string; amount: number }) => Math.abs(item.amount - target) <= 20_000;
  }
  const matchesName = createSearchMatcher(query);
  return (item: { title: string; amount: number }) => matchesName(item.title);
}
