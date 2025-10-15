import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function normalizePath(pathName: string) {
  return pathName.startsWith('file://') ? fileURLToPath(pathName) : pathName
}

export function resolvePathRelativeToMeta(importMeta: { url: string }, pathName: string) {
  return path.join(path.dirname(normalizePath(importMeta.url)), pathName)
}
