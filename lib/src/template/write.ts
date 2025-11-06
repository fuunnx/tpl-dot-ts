import fs from 'node:fs'
import {
	type MaterializedFile,
	type MaterializedDir,
	Taxonomy,
	type Materialized,
	type MaterializedReference,
} from '../types.ts'
import path from 'node:path'
import { mapValuesAsync } from '../lib/mapValuesAsync.ts'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { kindSym } from '../internal.ts'

export async function write(materialized: Materialized, outputName: string) {
	switch (materialized[kindSym]) {
		case Taxonomy.KindEnum.reference:
			return writeReference(materialized, outputName)
		case Taxonomy.KindEnum.dir:
			return writeDir(materialized, outputName)
		case Taxonomy.KindEnum.file:
			return writeFile(materialized, outputName)
		default:
			throw new Error(`Unknown kind ${materialized[kindSym]}`)
	}
}

export async function writeDir(dir: MaterializedDir, outputDir: string) {
	const tmpOutput = `${tmpdir()}/tpl-dot-ts-${randomUUID()}`
	await fs.promises.mkdir(tmpOutput, { recursive: true })

	const files = dir.content

	if (files === null) {
		await fs.promises.rm(outputDir, { recursive: true })
		return
	}

	await mapValuesAsync(files, async (materialized, fileName) => {
		return write(materialized, path.join(tmpOutput, String(fileName)))
	})

	await fs.promises.mkdir(outputDir, { recursive: true })
	await fs.promises.rm(outputDir, { recursive: true })
	await fs.promises.rename(tmpOutput, outputDir)
}

export async function writeFile(
	materialized: MaterializedFile,
	outputFileName: string,
) {
	if (materialized.content === null) return
	return fs.promises.writeFile(outputFileName, materialized.content)
}

export async function writeReference(
	Materialized: MaterializedReference,
	outputFileName: string,
) {
	await fs.promises.copyFile(Materialized.path, outputFileName)
}
