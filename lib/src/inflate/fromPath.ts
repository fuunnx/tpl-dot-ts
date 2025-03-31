import fs from 'node:fs';
import { isTplFile } from '../isTplFile.ts';
import { InflatableDir } from './Dir.ts';
import { InflatableReference } from './Reference.ts';
import { InflatableFile } from './File.ts';
export async function fromPath(pathName: string) {
  if (isTplFile(pathName)) {
    return InflatableFile.fromPath(pathName)
  }

  const stat = await fs.promises.stat(pathName)
  const isDir = stat.isDirectory()

  if (isDir) {
    return InflatableDir.fromPath(pathName)
  }

  return InflatableReference.fromPath(pathName)
}
