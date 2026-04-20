/** Format wait duration in whole minutes for human-readable dashboard copy. */
export function formatMinutesHumanReadable(totalMinutes: number): string {
  const m = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (m === 0) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h < 48) {
    if (remM === 0) return `${h}h`;
    return `${h}h ${remM}m`;
  }
  const d = Math.floor(h / 24);
  const remH = h % 24;
  if (remH === 0 && remM === 0) return `${d}d`;
  if (remM === 0) return `${d}d ${remH}h`;
  return `${d}d ${remH}h`;
}
