export function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}
