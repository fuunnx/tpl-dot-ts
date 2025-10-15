import fs from 'node:fs'
import { type ProvidedContext } from '../context.ts'
import {
	Taxonomy,
	type ITemplateReference,
	type MaterializedReference,
} from '../types.ts'
import { normalizePath } from '../lib/normalizePath.ts'
import { writeReference } from './write.ts'
import { stateSym, kindSym } from '../internal.ts'
import path from 'node:path'

export class TemplateReference implements ITemplateReference {
	readonly [stateSym] = Taxonomy.StateEnum.template
	readonly [kindSym] = Taxonomy.KindEnum.reference

	#pathName: string

	private constructor(pathName: string) {
		this.#pathName = pathName
	}

	static fromPath(pathName: string) {
		pathName = normalizePath(pathName)
		// check if exists
		fs.statSync(pathName)
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

	async write(outputFileName: string, relativeTo?: string) {
		return writeReference(await this.materialize(), relativeTo ? path.join(relativeTo, outputFileName) : outputFileName)
	}
}
