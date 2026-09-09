/**
 * UI-layer list filtering. Presentation only — no game math lives here.
 */

/** Case-insensitive substring filter; blank queries return everything. */
export function filterByName<T>(items: readonly T[], getName: (item: T) => string, query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [...items];
  return items.filter((item) => getName(item).toLowerCase().includes(needle));
}
