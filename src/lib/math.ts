export function abilityMod(score: number) {
  return Math.floor((score - 10) / 2);
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
