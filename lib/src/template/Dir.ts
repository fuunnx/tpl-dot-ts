import fs from 'node:fs'
import path from 'node:path'
import { type ProvidedContext } from '../context.ts'
import { tplFileExtensionRegex } from '../isTplFile.ts'
import {
	Taxonomy,
	type Template,
	type TemplateDirContent,
	type MaterializedDir,
} from '../types.ts'
import { mapValuesAsync } from '../lib/mapValuesAsync.ts'
import { writeDir } from './write.ts'
import { materialize } from './materialize.ts'
import { normalizePath } from '../lib/normalizePath.ts'
import { fromPath } from './fromPath.ts'
import { kindSym, stateSym } from '../internal.ts'

export class TemplateDir<
	Content extends TemplateDirContent = TemplateDirContent,
> {
	readonly [stateSym] = Taxonomy.StateEnum.template
	readonly [kindSym] = Taxonomy.KindEnum.dir

	#dirContent: Content
	contexts: ProvidedContext[]

	constructor(dirContent: Content, contexts: ProvidedContext[] = []) {
		this.#dirContent = dirContent
		this.contexts = contexts
	}

	withContext(...contexts: ProvidedContext[]) {
		return new TemplateDir(this.#dirContent, [...this.contexts, ...contexts])
	}

	static fromEntries<Content extends TemplateDirContent>(entries: Content) {
		return new TemplateDir(entries)
	}

	static async fromPath(pathName: string) {
		pathName = normalizePath(pathName)
		const inputFiles = fs.readdirSync(pathName, {
			recursive: false,
		})

		const files = await Promise.all(
			inputFiles.map(async (fileName): Promise<[string, Template] | null> => {
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

		return new TemplateDir(dirContent)
	}

	async content(): Promise<Content> {
		return (await mapValuesAsync(this.#dirContent, async (Template) => {
			const withContext = Template.withContext
				? Template.withContext(...this.contexts)
				: Template

			return withContext as typeof Template
		})) as Content
	}

	async materialize(): Promise<MaterializedDir> {
		return materialize(this, '')
	}

	async write(outputDir: string) {
		return writeDir(await this.materialize(), outputDir)
	}
}
