/** The next nearby round tick, strictly above the largest column. */
export function moneyAxisMaximum(highest: number) {
  if (highest <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(highest));
  const step = Math.max(1, highest / magnitude < 2 ? magnitude / 10 : magnitude / 2);
  return (Math.floor(highest / step) + 1) * step;
}
