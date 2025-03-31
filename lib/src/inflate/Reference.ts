import fs from 'node:fs';
import { type ProvidedContext } from '../context.ts';
import { familySym, kindSym, Taxonomy, type IInflatableReference, type WriteableReference } from '../types.ts';
import { normalizePath } from '../lib/normalizePath.ts';
import { writeReference } from './write.ts';

export class InflatableReference implements IInflatableReference {
  readonly [familySym] = Taxonomy.FamilyEnum.inflatable
  readonly [kindSym] = Taxonomy.KindEnum.reference

  #pathName: string

  private constructor(pathName: string) {
    this.#pathName = pathName
  }

  static async fromPath(pathName: string) {
    pathName = normalizePath(pathName)
    // check if exists
    await fs.promises.stat(pathName)
    return new this(pathName)
  }

  withContext(..._contexts: ProvidedContext[]) {
    return this
  }

  content() {
    return this.#pathName
  }

  async toWritable(): Promise<WriteableReference> {
    return {
      [familySym]: Taxonomy.FamilyEnum.writeable,
      [kindSym]: Taxonomy.KindEnum.reference,
      path: this.#pathName,
    }
  }

  async write(output: string) {
    return writeReference(await this.toWritable(), output)
  }
}
