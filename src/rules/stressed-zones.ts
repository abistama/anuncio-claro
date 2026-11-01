// Local table of municipalities declared as "zona de mercado residencial
// tensionado", keyed by INE municipal code. v1 seed covers a sample of the
// declarations in Cataluña, País Vasco and Galicia; it ships with the extension
// and is replaced on each release. Source to reconcile against: MIVAU/SERPAVI
// quarterly BOE resolutions (see PRD open question).
//
// This is a SEED, not an exhaustive list. Unknown municipality -> null (unknown),
// never a hard "false", so the UI can say "no podemos confirmar" instead of
// implying the zone is untensioned.

export interface StressedZone {
  ineCode: string;
  municipality: string;
  province: string;
}

export const STRESSED_ZONES: readonly StressedZone[] = [
  // Cataluña (Barcelona area sample)
  { ineCode: '08019', municipality: 'Barcelona', province: 'Barcelona' },
  { ineCode: '08101', municipality: "L'Hospitalet de Llobregat", province: 'Barcelona' },
  { ineCode: '08187', municipality: 'Sabadell', province: 'Barcelona' },
  { ineCode: '08279', municipality: 'Terrassa', province: 'Barcelona' },
  { ineCode: '08121', municipality: 'Mataró', province: 'Barcelona' },
  { ineCode: '17079', municipality: 'Girona', province: 'Girona' },
  { ineCode: '25120', municipality: 'Lleida', province: 'Lleida' },
  { ineCode: '43148', municipality: 'Tarragona', province: 'Tarragona' },
  // País Vasco (sample)
  { ineCode: '48020', municipality: 'Bilbao', province: 'Bizkaia' },
  { ineCode: '20069', municipality: 'Donostia / San Sebastián', province: 'Gipuzkoa' },
  { ineCode: '01059', municipality: 'Vitoria-Gasteiz', province: 'Araba' },
  // Galicia (sample)
  { ineCode: '15030', municipality: 'A Coruña', province: 'A Coruña' },
  { ineCode: '15078', municipality: 'Santiago de Compostela', province: 'A Coruña' },
];

const BY_INE = new Map(STRESSED_ZONES.map((z) => [z.ineCode, z]));

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/\s*\/\s*/g, ' / ')
    .trim();
}

const BY_NAME = new Map(STRESSED_ZONES.map((z) => [normalizeName(z.municipality), z]));

/**
 * Resolve a possibly-decorated location string to a table entry.
 * Portals often give "Barrio, Ciudad" ("La Nova Esquerra de l'Eixample,
 * Barcelona") or "Ciudad (Provincia)", so we try, in order:
 *   1. the whole string, exact;
 *   2. each comma/parenthesis segment, exact (handles "barrio, ciudad");
 *   3. whole-word containment of a known municipality name.
 * The segment pass runs before containment so a short name (e.g. a table entry)
 * can't match as an accidental substring of an unrelated longer word.
 */
function resolveZone(raw: string): StressedZone | undefined {
  const full = normalizeName(raw);
  if (!full) return undefined;

  const direct = BY_NAME.get(full);
  if (direct) return direct;

  const segments = full.split(/[,()]/).map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) {
    const hit = BY_NAME.get(seg);
    if (hit) return hit;
  }

  for (const [name, zone] of BY_NAME) {
    const re = new RegExp(`(?:^|\\s)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s)`);
    if (re.test(full)) return zone;
  }
  return undefined;
}

/**
 * Decide whether a listing is in a stressed zone.
 * Returns true/false when confident, or null when the municipality is unknown
 * to the table (so the caller can show "unknown" rather than "no").
 */
export function isStressedZone(opts: {
  ineCode?: string;
  municipality?: string;
}): boolean | null {
  if (opts.ineCode && BY_INE.has(opts.ineCode)) return true;
  if (opts.municipality && resolveZone(opts.municipality)) return true;
  return null;
}

export function lookupIneByName(municipality: string): string | undefined {
  return resolveZone(municipality)?.ineCode;
}
