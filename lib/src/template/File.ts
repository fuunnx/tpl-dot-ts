import fs from 'node:fs'
import { type ProvidedContext, runWithContexts } from '../context.ts'
import {
	Taxonomy,
	type ITemplateFile,
	type MaterializedFile,
} from '../types.ts'
import { normalizePath } from '../lib/normalizePath.ts'
import { writeFile } from './write.ts'
import { materialize } from './materialize.ts'
import { stateSym, kindSym } from '../internal.ts'
import path from 'node:path'

export class TemplateFile<T = unknown> implements ITemplateFile<T> {
	readonly [stateSym] = Taxonomy.StateEnum.template
	readonly [kindSym] = Taxonomy.KindEnum.file

	readonly contexts: ProvidedContext[]
  readonly #hoistedContent: () => T | Promise<T>

	constructor(content: () => T | Promise<T>, contexts: ProvidedContext[] = []) {
		this.contexts = contexts
    this.#hoistedContent = content
	}

	static fromPath(pathName: string) {
		pathName = normalizePath(pathName)
    return new TemplateFile(async () => {
      // check if exists
      await fs.promises.stat(pathName)
      const { default: result } = await import(pathName)
      if(typeof result === 'function') {
        return result()
      } else {
        return result
      }
    })
	}

	withContext(...contexts: ProvidedContext[]) {
		return new TemplateFile(this.#hoistedContent, [...this.contexts, ...contexts])
	}

	async content() {
		return runWithContexts(this.contexts, async () => await this.#hoistedContent())
	}

	async materialize(outputFileName: string): Promise<MaterializedFile> {
		return materialize(this, outputFileName)
	}

	async write(outputFileName: string, relativeTo?: string) {
		return writeFile(await this.materialize(outputFileName), relativeTo ? path.join(relativeTo, outputFileName) : outputFileName)
	}
}
