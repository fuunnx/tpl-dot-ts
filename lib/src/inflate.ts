import fs from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { randomUUID } from 'node:crypto'
import { register } from 'node:module'
import {
	type ProvidedContext,
	getSnapshotId,
	runWithContexts,
} from './context.ts'
import { isTplFile, tplFileExtensionRegex } from './isTplFile.ts'
import { combinePrinters } from './printers/lib.ts'
import {
	fallbackPrinter,
	jsonPrinter,
	yamlPrinter,
} from './printers/printers.ts'
import {
	familySym,
	kindSym,
	Taxonomy,
	type Inflate,
	type IInflatableFile,
	type IInflatableReference,
	type Inflatable,
	type InflatableDirContent,
	type Writeable,
	type WriteableDir,
	type WriteableFile,
	type WriteableReference,
} from './types.ts'

register(import.meta.url + '/../register.js')

export class InflatableReference implements IInflatableReference {
	readonly [familySym] = Taxonomy.FamilyEnum.inflatable
	readonly [kindSym] = Taxonomy.KindEnum.reference

	#pathName: string

	private constructor(pathName: string) {
		this.#pathName = pathName
	}

	static async fromPath(pathName: string) {
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

const printer = combinePrinters([
	yamlPrinter(),
	jsonPrinter(),
	fallbackPrinter(),
])
function print(outputFileName: string, content: unknown) {
	const fileName = path.basename(outputFileName)
	const printedValue = printer.print(fileName, content)

	if (printedValue === null) {
		throw new Error(
			`No printer found for ${outputFileName} and value of type ${typeof content}. Printer used: ${printer.name}`,
		)
	}

	return printedValue
}

function isInflatable(value: unknown): value is Inflatable {
	return (
		value !== null &&
		typeof value === 'object' &&
		familySym in value &&
		value[familySym] === Taxonomy.FamilyEnum.inflatable
	)
}
function isWriteable(value: unknown): value is Writeable {
	return (
		value !== null &&
		typeof value === 'object' &&
		familySym in value &&
		value[familySym] === Taxonomy.FamilyEnum.writeable
	)
}

async function toWritable<T extends Inflatable>(
	inflatable: T,
	outputFileName: string,
): Promise<Inflate<T>> {
	if (inflatable[kindSym] === Taxonomy.KindEnum.file) {
		const content = await inflatable.content()
		if (isInflatable(content)) {
			return (await toWritable(content, outputFileName)) as Inflate<T>
		}
		if (isWriteable(content)) {
			return content as Inflate<T>
		}

		return {
			[familySym]: Taxonomy.FamilyEnum.writeable,
			[kindSym]: Taxonomy.KindEnum.file,
			content: print(outputFileName, await inflatable.content()),
		} satisfies WriteableFile as Inflate<T>
	}

	if (inflatable[kindSym] === Taxonomy.KindEnum.reference) {
		return {
			[familySym]: Taxonomy.FamilyEnum.writeable,
			[kindSym]: Taxonomy.KindEnum.reference,
			path: await inflatable.content(),
		} satisfies WriteableReference as Inflate<T>
	}

	if (inflatable[kindSym] === Taxonomy.KindEnum.dir) {
		const content: WriteableDir['content'] = await mapValuesAsync(
			await inflatable.content(),
			(value, key) => {
				return toWritable(value, key)
			},
		)

		return {
			[familySym]: Taxonomy.FamilyEnum.writeable,
			[kindSym]: Taxonomy.KindEnum.dir,
			content,
		} satisfies WriteableDir as Inflate<T>
	}

	throw new Error(`Unknown kind ${inflatable[kindSym]}`)
}

export class InflatableDir<
	Content extends InflatableDirContent = InflatableDirContent,
> {
	readonly [familySym] = Taxonomy.FamilyEnum.inflatable
	readonly [kindSym] = Taxonomy.KindEnum.dir

	#dirContent: Content
	#contexts: ProvidedContext[]

	constructor(dirContent: Content, contexts: ProvidedContext[] = []) {
		this.#dirContent = dirContent
		this.#contexts = contexts
	}

	withContext(...contexts: ProvidedContext[]) {
		return new InflatableDir(this.#dirContent, [...this.#contexts, ...contexts])
	}

	static fromEntries<Content extends InflatableDirContent>(entries: Content) {
		return new InflatableDir(entries)
	}

	static async fromPath(pathName: string) {
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
					await Tpl.from(path.join(pathName, fileName)),
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
					? inflatable.withContext(...this.#contexts)
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

async function writeWriteable(writeable: Writeable, outputName: string) {
	switch (writeable[kindSym]) {
		case Taxonomy.KindEnum.reference:
			return writeReference(writeable, outputName)
		case Taxonomy.KindEnum.dir:
			return writeDir(writeable, outputName)
		case Taxonomy.KindEnum.file:
			return writeFile(writeable, outputName)
		default:
			throw new Error(`Unknown kind ${writeable[kindSym]}`)
	}
}

async function writeDir(dir: WriteableDir, outputDir: string) {
	const tmpOutput = `${tmpdir()}/tpl.ts-${randomUUID()}`
	await fs.promises.mkdir(tmpOutput, { recursive: true })

	const files = dir.content

	await mapValuesAsync(files, async (writeable, fileName) => {
		return writeWriteable(writeable, path.join(tmpOutput, String(fileName)))
	})

	await fs.promises.mkdir(outputDir, { recursive: true })
	await fs.promises.rm(outputDir, { recursive: true })
	await fs.promises.rename(tmpOutput, outputDir)
}

async function writeReference(
	writeable: WriteableReference,
	outputFileName: string,
) {
	await fs.promises.copyFile(writeable.path, outputFileName)
}

async function writeFile(writeable: WriteableFile, outputFileName: string) {
	return fs.promises.writeFile(outputFileName, writeable.content)
}

// export async function flattenContent(
// 	dir: DirContent,
// ): Promise<Record<string, unknown>> {
// 	return mapValuesAsync(dir, async (value) => {
// 		const x = await value.content()
// 		if (x && typeof x === 'object' && '~kind' in x && x['~kind'] === 'dir') {
// 			return await flattenContent(x)
// 		}
// 		return x
// 	})
// }

function mapValues<T extends Record<string, any>, U>(
	obj: T,
	fn: (value: T[keyof T], key: keyof T) => U,
): { [key in keyof T]: U } {
	return Object.fromEntries(
		Object.entries(obj).map(([key, value]) => [key, fn(value, key)]),
	) as { [key in keyof T]: U }
}

async function mapValuesAsync<T extends Record<string, any>, U>(
	obj: T,
	fn: (value: T[keyof T], key: keyof T) => Promise<U>,
): Promise<{ [key in keyof T]: U }> {
	return Object.fromEntries(
		await Promise.all(
			Object.entries(obj).map(async ([key, value]) => {
				return [key, await fn(value, key)]
			}),
		),
	) as { [key in keyof T]: U }
}

export const Tpl = {
	async from(
		pathName: string,
	): Promise<InflatableFile | InflatableReference | InflatableDir> {
		if (isTplFile(pathName)) {
			return InflatableFile.fromPath(pathName)
		}

		const stat = await fs.promises.stat(pathName)
		const isDir = stat.isDirectory()

		if (isDir) {
			return InflatableDir.fromPath(pathName)
		}

		return InflatableReference.fromPath(pathName)
	},
}
