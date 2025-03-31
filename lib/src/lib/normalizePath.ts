import { fileURLToPath } from 'node:url';
export function normalizePath(pathName: string) {
  return pathName.startsWith('file://') ? fileURLToPath(pathName) : pathName
}
