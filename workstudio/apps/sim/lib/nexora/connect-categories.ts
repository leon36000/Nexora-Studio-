/**
 * One key per category, whatever spelling Connect gives it: its providers write the same
 * category several ways (`Cross-border E-commerce`, `CrossBorderE-commerce`…).
 */
export function catalogCategoryKey(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** The catalog's categories, one per key, under the first spelling met, sorted. */
export function distinctCatalogCategories(categories: Iterable<string>): string[] {
  const byKey = new Map<string, string>()
  for (const category of categories) {
    const key = catalogCategoryKey(category)
    if (key && !byKey.has(key)) byKey.set(key, category)
  }
  return [...byKey.values()].sort()
}
