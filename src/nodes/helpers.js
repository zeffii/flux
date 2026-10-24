export const num = (name, def, min = -10, max = 10, extra = {}) => ({ name, kind: 'num', def, min, max, ...extra });
export const geoIn = name => ({ name, kind: 'geo' });
export const clampInt = (list, lo, hi) => Math.min(hi, Math.max(lo, Math.round(list[0] ?? lo)));
