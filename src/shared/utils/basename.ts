export function basename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const last = normalized.lastIndexOf('/');
  return last === -1 ? normalized : normalized.slice(last + 1);
}
