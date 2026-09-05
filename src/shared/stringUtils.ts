export function toKebabCase(str: string, trim: boolean = true) {
  const untrimmed = str
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-");
  return trim ? untrimmed.replace(/^-|-$/g, "") : untrimmed;
}
