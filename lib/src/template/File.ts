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
export class TemplateFile implements ITemplateFile {
	readonly [stateSym] = Taxonomy.StateEnum.template
	readonly [kindSym] = Taxonomy.KindEnum.file

	#pathName: string
	readonly contexts: ProvidedContext[]

	private constructor(pathName: string, contexts: ProvidedContext[] = []) {
		this.#pathName = pathName
		this.contexts = contexts
	}

	static async fromPath(pathName: string) {
		pathName = normalizePath(pathName)
		// check if exists
		await fs.promises.stat(pathName)
		return new TemplateFile(pathName)
	}

	withContext(...contexts: ProvidedContext[]) {
		return new TemplateFile(this.#pathName, [...this.contexts, ...contexts])
	}

	async content() {
		const { default: result } = await import(this.#pathName)
		if (typeof result === 'function') {
			return runWithContexts(this.contexts, result)
		} else {
			return result
		}
	}

	async toWritable(outputFileName: string): Promise<MaterializedFile> {
		return materialize(this, outputFileName)
	}

	async write(outputFileName: string) {
		return writeFile(await this.toWritable(outputFileName), outputFileName)
	}
}
