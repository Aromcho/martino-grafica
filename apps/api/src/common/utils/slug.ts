/** "Perfumes Árabes & Más" -> "perfumes-arabes-mas" */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Genera un slug único consultando una función de existencia */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base) || 'item';
  let slug = root;
  let i = 2;
  while (await exists(slug)) {
    slug = `${root}-${i++}`;
  }
  return slug;
}
