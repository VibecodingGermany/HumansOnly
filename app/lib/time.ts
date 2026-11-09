const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["minute", 60],
  ["hour", 3600],
  ["day", 86400],
];
/** „gerade eben“, „vor 5 Minuten“, „vor 3 Tagen“, danach ein Datum. */
export function timeAgo(iso: string, now = Date.now()) {
  const then = new Date(iso).getTime();
  const seconds = Math.round((now - then) / 1000);
  if (!Number.isFinite(seconds)) return "";
  if (seconds < 45) return "gerade eben";
  const rtf = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });
  if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), units[0][0]);
  if (seconds < 86400)
    return rtf.format(-Math.round(seconds / 3600), units[1][0]);
  if (seconds < 7 * 86400)
    return rtf.format(-Math.round(seconds / 86400), units[2][0]);
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year:
      new Date(iso).getFullYear() === new Date(now).getFullYear()
        ? undefined
        : "numeric",
    timeZone: "Europe/Berlin",
  });
}
/** „Gefällt Mira“, „Gefällt Mira und Jonas“, „Gefällt Mira, Jonas und 3 weiteren“. */
export function likeSummary(names: string[]) {
  if (!names.length) return "";
  if (names.length === 1) return `Gefällt ${names[0]}`;
  if (names.length === 2) return `Gefällt ${names[0]} und ${names[1]}`;
  const rest = names.length - 2;
  const others = rest === 1 ? "einer weiteren Person" : `${rest} weiteren`;
  return `Gefällt ${names[0]}, ${names[1]} und ${others}`;
}
