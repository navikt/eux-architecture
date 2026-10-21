type Plain = Record<string, unknown>;

const definedKeys = (o: Plain) => Object.keys(o).filter((k) => o[k] !== undefined);

/**
 * Structural equality for plain data (primitives, arrays and plain objects).
 * Key order does not matter, and an object key set to `undefined` counts as missing, as in JSON.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  const ka = definedKeys(a as Plain);
  return ka.length === definedKeys(b as Plain).length && ka.every((k) => deepEqual((a as Plain)[k], (b as Plain)[k]));
}
