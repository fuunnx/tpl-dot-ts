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
import { kindSym } from '../internal.ts'
import { withAtomicDir, safeRm, withAtomicFile } from '../lib/atomicFS'

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
	const files = dir.content

	if (files === null) {
		await safeRm(outputDir)
		return
	}

	return withAtomicDir(outputDir, async (tmpdir) => {
		await mapValuesAsync(files, async (materialized, fileName) => {
			return write(materialized, path.join(tmpdir, String(fileName)))
		})
	})
}

export async function writeFile(
	materialized: MaterializedFile,
	outputFileName: string,
) {
	if (materialized.content === null) return
	return withAtomicFile(outputFileName, async (tmpFile) => {
		await fs.promises.writeFile(tmpFile, materialized.content!)
	})
}

export async function writeReference(
	Materialized: MaterializedReference,
	outputFileName: string,
) {
	return withAtomicFile(outputFileName, async (tmpFile) => {
		await fs.promises.copyFile(Materialized.path, tmpFile)
	})
}
