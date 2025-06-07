import fs from 'node:fs'
import path from 'node:path'
import { type ProvidedContext } from '../context.ts'
import { tplFileExtensionRegex } from '../isTplFile.ts'
import {
	familySym,
	kindSym,
	Taxonomy,
	type Inflatable,
	type InflatableDirContent,
	type WriteableDir,
} from '../types.ts'
import { mapValuesAsync } from '../lib/mapValuesAsync.ts'
import { writeDir } from './write.ts'
import { toWritable } from './toWriteable.ts'
import { normalizePath } from '../lib/normalizePath.ts'
import { fromPath } from './fromPath.ts'

export class InflatableDir<
	Content extends InflatableDirContent = InflatableDirContent,
> {
	readonly [familySym] = Taxonomy.FamilyEnum.inflatable
	readonly [kindSym] = Taxonomy.KindEnum.dir

	#dirContent: Content
	contexts: ProvidedContext[]

	constructor(dirContent: Content, contexts: ProvidedContext[] = []) {
		this.#dirContent = dirContent
		this.contexts = contexts
	}

	withContext(...contexts: ProvidedContext[]) {
		return new InflatableDir(this.#dirContent, [...this.contexts, ...contexts])
	}

	static fromEntries<Content extends InflatableDirContent>(entries: Content) {
		return new InflatableDir(entries)
	}

	static async fromPath(pathName: string) {
		pathName = normalizePath(pathName)
		const inputFiles = fs.readdirSync(pathName, {
			recursive: false,
		})

		const files = await Promise.all(
			inputFiles.map(async (fileName): Promise<[string, Inflatable] | null> => {
				fileName = fileName.toString()

				// ignore if file looks like `(**)` or `(**).*`
				const isIgnored = fileName.match(/^\(.*\)(..+)?$/)
				if (isIgnored) return null
				return [
					fileName.replace(tplFileExtensionRegex, ''),
					await fromPath(path.join(pathName, fileName)),
				] as const
			}),
		)

		const dirContent = Object.fromEntries(files.filter((x) => x !== null))

		return new InflatableDir(dirContent)
	}

	async content(): Promise<Content> {
		return (await mapValuesAsync(
			this.#dirContent,
			async (inflatable): Promise<typeof inflatable> => {
				const withContext = inflatable.withContext
					? inflatable.withContext(...this.contexts)
					: inflatable

				return withContext as typeof inflatable
			},
		)) as Content
	}

	async toWritable(): Promise<WriteableDir> {
		return toWritable(this, '')
	}

	async write(outputDir: string) {
		return writeDir(await this.toWritable(), outputDir)
	}
}
