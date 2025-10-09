import fs from 'node:fs'
import { isTplFile } from '../isTplFile.ts'
import { TemplateDir } from './Dir.ts'
import { TemplateReference } from './Reference.ts'
import { TemplateFile } from './File.ts'

export async function fromPath(pathName: string) {
	if (isTplFile(pathName)) {
		return TemplateFile.fromPath(pathName)
	}

	const stat = await fs.promises.stat(pathName)
	const isDir = stat.isDirectory()

	if (isDir) {
		return TemplateDir.fromPath(pathName)
	}

	return TemplateReference.fromPath(pathName)
}
