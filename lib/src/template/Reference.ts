import fs from 'node:fs'
import { type ProvidedContext } from '../context.ts'
import {
	Taxonomy,
	type ITemplateReference,
	type MaterializedReference,
} from '../types.ts'
import { normalizePath, resolvePathRelativeToMeta } from '../lib/normalizePath.ts'
import { writeReference } from './write.ts'
import { stateSym, kindSym } from '../internal.ts'

export class TemplateReference implements ITemplateReference {
	readonly [stateSym] = Taxonomy.StateEnum.template
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

	async materialize(): Promise<MaterializedReference> {
		return {
			[stateSym]: Taxonomy.StateEnum.materialized,
			[kindSym]: Taxonomy.KindEnum.reference,
			path: this.#pathName,
		}
	}

	async write(importMeta: ImportMeta, output: string) {
		return writeReference(await this.materialize(), resolvePathRelativeToMeta(importMeta, output))
	}
}
