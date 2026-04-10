export function normalizeName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // substitui caracteres especiais por hifen
    .replace(/^-+|-+$/g, ""); // remove hifens no inicio/fim
}

export function buildFileName(
  seq: number,
  faseNome: string,
  obraNome: string,
  date: Date,
  ext: string
): string {
  const seqStr = seq.toString().padStart(3, "0");
  const fase = normalizeName(faseNome);
  const obra = normalizeName(obraNome);
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

  return `${seqStr}_${fase}_${obra}_${dateStr}.${ext}`;
}

export function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
  };
  return map[mimeType] || "jpg";
}
