export const slugify = (value: string): string => {
  const input = String(value || '').trim().toLowerCase();
  if (!input) return '';

  // Basic latin slugification; good enough for demo URLs.
  const cleaned = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');

  return cleaned;
};

export const looksLikeUuid = (value: string): boolean => {
  const v = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
};

export const periodPathKey = (period: { id?: string; name?: string } | null | undefined): string => {
  if (!period) return '';
  const name = String(period.name || '').trim();
  const byName = slugify(name);
  if (byName) return byName;
  return String(period.id || '').trim();
};
