import path from 'node:path'
import { type ProvidedContext, runWithContexts } from '../context.ts'
import { tplFileExtensionRegex } from '../isTplFile.ts'
import {
	Taxonomy,
	type Template,
	type TemplateDirContent,
	type MaterializedDir,
} from '../types.ts'
import { mapValuesAsync } from '../lib/mapValuesAsync.ts'
import { writeDir } from './write.ts'
import { isTemplate, materialize } from './materialize.ts'
import { normalizePath } from '../lib/normalizePath.ts'
import { fromPath } from './fromPath.ts'
import { kindSym, stateSym } from '../internal.ts'
import { readdir } from 'node:fs/promises'

export class TemplateDir<
	Content extends TemplateDirContent = TemplateDirContent,
> {
	readonly [stateSym] = Taxonomy.StateEnum.template
	readonly [kindSym] = Taxonomy.KindEnum.dir

	#hoistedContent: () => Content | Promise<Content>
	contexts: ProvidedContext[]

	constructor(
		dirContent: () => Content | Promise<Content>,
		contexts: ProvidedContext[] = [],
	) {
		this.#hoistedContent = dirContent
		this.contexts = contexts
	}

	withContext(...contexts: ProvidedContext[]) {
		return new TemplateDir(this.#hoistedContent, [
			...this.contexts,
			...contexts,
		])
	}

	static fromEntries<Content extends TemplateDirContent>(entries: Content) {
		return new TemplateDir(() => entries)
	}

	static fromPath(pathName: string) {
		pathName = normalizePath(pathName)

		return new TemplateDir(async () => {
			const inputFiles = await readdir(pathName, {
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

			return dirContent
		})
	}

	async content(): Promise<Content> {
		const contexts = this.contexts
		return runWithContexts(contexts, async () => {
			return (await mapDirContent(
				await this.#hoistedContent(),
				async (template) => {
					const withContext = template.withContext
						? template.withContext(...contexts)
						: template

					return withContext
				},
			)) as Content
		})
	}

	async materialize(): Promise<MaterializedDir> {
		return materialize(this, '')
	}

	async write(outputDir: string, relativeTo?: string) {
		return writeDir(
			await this.materialize(),
			relativeTo ? path.join(relativeTo, outputDir) : outputDir,
		)
	}
}

type MapDirContent<T extends TemplateDirContent, U> = {
	[key in keyof T]: T[key] extends Template
		? U
		: T[key] extends TemplateDirContent
			? MapDirContent<T[key], U>
			: T[key]
}

async function mapDirContent<T extends TemplateDirContent, U>(
	content: T,
	callback: (value: Template, path: string[]) => Promise<U>,
	path: string[] = [],
): Promise<MapDirContent<T, U>> {
	return mapValuesAsync(
		content,
		(value, key): Promise<U | MapDirContent<TemplateDirContent, U>> => {
			if (isTemplate(value)) {
				return callback(value, [...path, key.toString()])
			} else {
				return mapDirContent(value, callback, [...path, key.toString()])
			}
		},
	) as Promise<MapDirContent<T, U>>
}
