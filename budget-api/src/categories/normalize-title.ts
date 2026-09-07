/**
 * Нормализация названия категории перед записью: `trim` + первая буква в
 * верхнем регистре.
 */
export function normalizeCategoryTitle(raw: string): string {
  const t = raw.trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}
