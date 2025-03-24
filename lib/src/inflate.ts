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
import type { DirContent, Writeable, WriteableDir } from './types.ts'

register(import.meta.url + '/../register.js')

type AnyInflatable = InflatableStatic | InflatableFile | InflatableDir

class InflatableStatic {
	#pathName: string

	private constructor(pathName: string) {
		this.#pathName = pathName
	}

	static async fromPath(pathName: string) {
		// check if exists
		await fs.promises.stat(pathName)
		return new InflatableStatic(pathName)
	}

	withContext(..._contexts: ProvidedContext[]) {
		return this
	}

	content() {
		return this
	}

	async write(outputDir: string, outputFileName?: string) {
		await fs.promises.copyFile(
			path.join(this.#pathName),
			path.join(outputDir, outputFileName ?? path.basename(this.#pathName)),
		)
	}
}

class InflatableFile {
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

	async write(outputFileName: string) {
		return writeFile(outputFileName, this)
	}
}

class InflatableDir<Content extends DirContent = DirContent> {
	'~kind': 'dir' = 'dir'

	#dirContent: Content
	#contexts: ProvidedContext[]

	constructor(dirContent: Content, contexts: ProvidedContext[] = []) {
		this.#dirContent = dirContent
		this.#contexts = contexts
	}

	withContext(...contexts: ProvidedContext[]) {
		return new InflatableDir(this.#dirContent, [...this.#contexts, ...contexts])
	}

	static async fromPath(pathName: string) {
		const inputFiles = fs.readdirSync(pathName, {
			recursive: false,
		})

		const files = await Promise.all(
			inputFiles.map(
				async (fileName): Promise<[string, AnyInflatable] | null> => {
					fileName = fileName.toString()

					// ignore if file looks like `(**)` or `(**).*`
					const isIgnored = fileName.match(/^\(.*\)(..+)?$/)
					if (isIgnored) return null
					return [
						fileName.replace(tplFileExtensionRegex, ''),
						await fromPath(path.join(pathName, fileName)),
					] as const
				},
			),
		)

		const dirContent = Object.fromEntries(files.filter((x) => x !== null))

		return new InflatableDir(dirContent)
	}

	async content() {
		return mapValuesAsync(this.#dirContent, async (inflatable) => {
			const withContext = inflatable.withContext
				? inflatable.withContext(...this.#contexts)
				: inflatable

			return await withContext.content()
		})
	}

	async write(outputDir: string) {
		return writeDir(outputDir, this)
	}
}

export function defineDir<T extends DirContent>(entries: T) {
	return new InflatableDir(entries)
}

async function writeDir(outputDir: string, dir: WriteableDir) {
	const tmpOutput = `${tmpdir()}/tpl.ts-${randomUUID()}`
	await fs.promises.mkdir(tmpOutput, { recursive: true })

	const files = await dir.content()

	await Promise.all(
		Object.entries(files).map(async ([fileName, inflatable]) => {
			if ('~kind' in inflatable && inflatable['~kind'] === 'dir') {
				return writeDir(path.join(tmpOutput, fileName), inflatable)
			} else {
				return writeFile(path.join(tmpOutput, fileName), inflatable)
			}
		}),
	)

	await fs.promises.mkdir(outputDir, { recursive: true })
	await fs.promises.rm(outputDir, { recursive: true })
	await fs.promises.rename(tmpOutput, outputDir)
}

export async function writeFile(outputFileName: string, writeable: Writeable) {
	// if ('~kind' in writeable && writeable['~kind'] === 'dir') {
	// 	return writeDir(outputFileName, writeable)
	// }
	const result = await writeable.content()

	const fileName = path.basename(outputFileName)
	const printedValue = printer.print(fileName, result)

	if (printedValue === null) {
		throw new Error(
			`No printer found for ${outputFileName} and value of type ${typeof result}. Printer used: ${printer.name}`,
		)
	}

	return fs.promises.writeFile(outputFileName, printedValue)
}

export async function flattenContent(
	dir: DirContent,
): Promise<Record<string, unknown>> {
	return Object.fromEntries(
		await Promise.all(
			Object.entries(dir).map(async ([key, value]) => {
				const x = await value.content()
				console.log(x['~kind'], x)
				if (
					x &&
					typeof x === 'object' &&
					'~kind' in x &&
					x['~kind'] === 'dir'
				) {
					return [key, await flattenContent(x)]
				}
				return [key, x]
			}),
		),
	)
}

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
	fn: (value: T[keyof T], key: keyof T) => U,
): Promise<{ [key in keyof T]: U }> {
	return Object.fromEntries(
		await Promise.all(
			Object.entries(obj).map(([key, value]) => [key, fn(value, key)]),
		),
	) as { [key in keyof T]: U }
}

const printer = combinePrinters([
	yamlPrinter(),
	jsonPrinter(),
	fallbackPrinter(),
])

/** same version as `Tpl.from`, but async for better performance */
async function fromPath(
	pathName: string,
): Promise<InflatableFile | InflatableStatic | InflatableDir> {
	if (isTplFile(pathName)) {
		return InflatableFile.fromPath(pathName)
	}

	const stat = await fs.promises.stat(pathName)
	const isDir = stat.isDirectory()

	if (isDir) {
		return InflatableDir.fromPath(pathName)
	}

	return InflatableStatic.fromPath(pathName)
}

export const Tpl = {
	from(pathName: string) {
		if (isTplFile(pathName)) {
			return InflatableFile.fromPath(pathName)
		}

		const stat = fs.statSync(pathName)
		const isDir = stat.isDirectory()

		if (isDir) {
			return InflatableDir.fromPath(pathName)
		}

		return InflatableStatic.fromPath(pathName)
	},
}
