/**
 * A short fingerprint of CSS, to tell whether it changed since it was saved.
 * FNV-1a: fast, synchronous and plenty for spotting edits. Whitespace around
 * the CSS doesn't count: removing an empty last rule takes the trailing
 * newline with it.
 */
export const hashCss = (css: string): string => {
  const trimmed = css.trim();
  let hash = 0x811c9dc5;

  for (let i = 0; i < trimmed.length; i++) {
    hash ^= trimmed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16);
};
