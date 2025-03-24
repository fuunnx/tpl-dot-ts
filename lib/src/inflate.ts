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

interface Inflatable {
	kind: 'inflatable'

	withContext(context: ProvidedContext): this
	write(outputDir: string, outputFileName?: string): Promise<void>
}

class NonInflatable implements Inflatable {
	kind = 'inflatable' as const

	#absolutePathName: string

	constructor(absolutePathName: string) {
		this.#absolutePathName = absolutePathName
	}

	withContext(..._contexts: ProvidedContext[]) {
		return this
	}

	content() {
		return this
	}

	async write(outputDir: string, outputFileName?: string) {
		await fs.promises.copyFile(
			path.join(this.#absolutePathName),
			path.join(
				outputDir,
				outputFileName ?? path.basename(this.#absolutePathName),
			),
		)
	}
}

class InflatableFile {
	kind = 'inflatable' as const

	#absolutePathName: string
	#contexts: ProvidedContext[]

	constructor(absolutePathName: string, contexts: ProvidedContext[] = []) {
		this.#absolutePathName = absolutePathName
		this.#contexts = contexts
	}

	withContext(...contexts: ProvidedContext[]) {
		return new InflatableFile(this.#absolutePathName, [
			...this.#contexts,
			...contexts,
		])
	}

	async content() {
		const contextsSnapshoptId = getSnapshotId(this.#contexts)
		return runWithContexts(this.#contexts, async () => {
			const originalFileName = path.join(this.#absolutePathName)
			const copyFileName = path.resolve(
				`${originalFileName}?context=${contextsSnapshoptId}.js`,
			)

			const { default: result } = await import(copyFileName)
			return result
		})
	}

	async write(outputDir: string, outputFileName?: string) {
		const fileName =
			outputFileName ??
			path.basename(this.#absolutePathName).replace(tplFileExtensionRegex, '')
		return writeFile(path.join(outputDir, fileName), this)
	}
}

class InflatableDir {
	'~kind' = 'dir' as const

	#absolutePathName: string
	#contexts: ProvidedContext[]

	constructor(absolutePathName: string, contexts: ProvidedContext[] = []) {
		this.#absolutePathName = absolutePathName
		this.#contexts = contexts
	}

	withContext(...contexts: ProvidedContext[]) {
		return new InflatableDir(this.#absolutePathName, [
			...this.#contexts,
			...contexts,
		])
	}

	async content() {
		const inputFiles = fs.readdirSync(this.#absolutePathName, {
			recursive: false,
		})

		const files = await Promise.all(
			inputFiles.map(async (fileName) => {
				fileName = fileName.toString()
				const inflatable = await inflateAsync(
					path.join(this.#absolutePathName, fileName),
				)

				// ignore if file looks like `(**)` or `(**).*`
				const isIgnored = fileName.match(/^\(.*\)(..+)?$/)
				if (isIgnored) return null
				return [
					fileName.replace(tplFileExtensionRegex, ''),
					inflatable.withContext(...this.#contexts),
				] as const
			}),
		)

		return Object.fromEntries(files.filter((x) => x !== null))
	}
}

export async function writeDir(outputDir: string, dir: WriteableDir) {
	const tmpOutput = `${tmpdir()}/tpl.ts-${randomUUID()}`
	await fs.promises.mkdir(tmpOutput, { recursive: true })

	const files = await dir.content()

	await Promise.all(
		Object.entries(files).map(async ([fileName, inflatable]) => {
			if ('~kind' in inflatable && inflatable['~kind'] === 'dir') {
				return writeDir(path.join(tmpOutput, fileName), inflatable)
			} else {
				return writeFile(path.join(tmpOutput), inflatable)
			}
		}),
	)

	await fs.promises.mkdir(outputDir, { recursive: true })
	await fs.promises.rm(outputDir, { recursive: true })
	await fs.promises.rename(tmpOutput, outputDir)
}

export async function writeFile(outputFileName: string, writeable: Writeable) {
	if ('~kind' in writeable && writeable['~kind'] === 'dir') {
		return writeDir(outputFileName, writeable)
	}
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

const printer = combinePrinters([
	yamlPrinter(),
	jsonPrinter(),
	fallbackPrinter(),
])

/** same version as `inflate`, but async for better performance */
async function inflateAsync(absolutePathName: string) {
	if (isTplFile(absolutePathName)) {
		return new InflatableFile(absolutePathName)
	}

	const stat = await fs.promises.stat(absolutePathName)
	const isDir = stat.isDirectory()

	if (isDir) {
		return new InflatableDir(absolutePathName)
	}

	return new NonInflatable(absolutePathName)
}

/** same version as `inflateAsync`, but sync for end user convenience */
export const Tpl = {
	from(absolutePathName: string) {
		if (isTplFile(absolutePathName)) {
			return new InflatableFile(absolutePathName)
		}

		const stat = fs.statSync(absolutePathName)
		const isDir = stat.isDirectory()

		if (isDir) {
			return new InflatableDir(absolutePathName)
		}

		return new NonInflatable(absolutePathName)
	},
}
