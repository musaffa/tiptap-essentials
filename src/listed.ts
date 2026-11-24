/**
 * A value read from a body, kept only where the list of the values it may take
 * names it as it is written. Without a list, any value is kept.
 */
export function ifListed(value: unknown, list: readonly string[] | null) {
  if (typeof value !== 'string') {
    return null;
  }

  return list === null || list.includes(value) ? value : null;
}
