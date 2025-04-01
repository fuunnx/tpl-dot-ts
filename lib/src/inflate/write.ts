import fs from 'node:fs';
import { type WriteableFile, type WriteableDir, kindSym, Taxonomy, type Writeable, type WriteableReference } from '../types.ts';
import path from 'node:path';
import { mapValuesAsync } from '../lib/mapValuesAsync.ts';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

export async function writeWriteable(writeable: Writeable, outputName: string) {
  switch (writeable[kindSym]) {
    case Taxonomy.KindEnum.reference:
      return writeReference(writeable, outputName)
    case Taxonomy.KindEnum.dir:
      return writeDir(writeable, outputName)
    case Taxonomy.KindEnum.file:
      return writeFile(writeable, outputName)
    default:
      throw new Error(`Unknown kind ${writeable[kindSym]}`)
  }
}


export async function writeDir(dir: WriteableDir, outputDir: string) {
  const tmpOutput = `${tmpdir()}/tpl-dot-ts-${randomUUID()}`
  await fs.promises.mkdir(tmpOutput, { recursive: true })

  const files = dir.content

  await mapValuesAsync(files, async (writeable, fileName) => {
    return writeWriteable(writeable, path.join(tmpOutput, String(fileName)))
  })

  await fs.promises.mkdir(outputDir, { recursive: true })
  await fs.promises.rm(outputDir, { recursive: true })
  await fs.promises.rename(tmpOutput, outputDir)
}


export async function writeFile(writeable: WriteableFile, outputFileName: string) {
  return fs.promises.writeFile(outputFileName, writeable.content)
}

export async function writeReference(
  writeable: WriteableReference,
  outputFileName: string,
) {
  await fs.promises.copyFile(writeable.path, outputFileName)
}
