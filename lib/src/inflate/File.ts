import fs from 'node:fs';
import { type ProvidedContext, runWithContexts } from '../context.ts';
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
    const { default: result } = await import(this.#pathName)
    if (typeof result === 'function') {
      return runWithContexts(this.#contexts, result)
    } else {
      return result
    }
  }

  async toWritable(outputFileName: string): Promise<WriteableFile> {
    return toWritable(this, outputFileName)
  }

  async write(outputFileName: string) {
    return writeFile(await this.toWritable(outputFileName), outputFileName)
  }
}
