/** Ta sama lista co `ADMIN_AUTH0_SUBS` na API — tylko UX (menu); autoryzacja jest po stronie serwera. */
export function parseStaffAdminAllowlist(): Set<string> {
  const raw = import.meta.env.VITE_ADMIN_AUTH0_SUBS ?? '';
  return new Set(
    raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  );
}

export function isStaffAdmin(sub: string | undefined): boolean {
  if (!sub) return false;
  const set = parseStaffAdminAllowlist();
  if (set.size === 0) return false;
  return set.has(sub);
}
