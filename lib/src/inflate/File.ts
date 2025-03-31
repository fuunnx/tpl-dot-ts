import fs from 'node:fs';
import path from 'node:path';
import { type ProvidedContext, getSnapshotId, runWithContexts } from '../context.ts';
import { familySym, kindSym, Taxonomy, type IInflatableFile, type WriteableFile } from '../types.ts';
import { normalizePath } from '../lib/normalizePath.ts';
import { writeFile } from './write.ts';
import { toWritable } from './toWriteable.ts';
export class InflatableFile implements IInflatableFile {
  readonly [familySym] = Taxonomy.FamilyEnum.inflatable
  readonly [kindSym] = Taxonomy.KindEnum.file

  #pathName: string
  #contexts: ProvidedContext[]

  private constructor(pathName: string, contexts: ProvidedContext[] = []) {
    this.#pathName = pathName
    this.#contexts = contexts
  }

  static async fromPath(pathName: string) {
    pathName = normalizePath(pathName)
    // check if exists
    await fs.promises.stat(pathName)
    return new InflatableFile(pathName)
  }

  withContext(...contexts: ProvidedContext[]) {
    return new InflatableFile(this.#pathName, [...this.#contexts, ...contexts])
  }

  async content() {
    const contextsSnapshoptId = getSnapshotId(this.#contexts)
    return runWithContexts(this.#contexts, async () => {
      const originalFileName = this.#pathName
      const copyFileName = path.resolve(
        `${originalFileName}?context=${contextsSnapshoptId}.js`,
      )

      const { default: result } = await import(copyFileName)
      return result
    })
  }

  async toWritable(outputFileName: string): Promise<WriteableFile> {
    return toWritable(this, outputFileName)
  }

  async write(outputFileName: string) {
    return writeFile(await this.toWritable(outputFileName), outputFileName)
  }
}
