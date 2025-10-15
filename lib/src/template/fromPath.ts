import fs from 'node:fs'
import { isTplFile } from '../isTplFile.ts'
import { TemplateDir } from './Dir.ts'
import { TemplateReference } from './Reference.ts'
import { TemplateFile } from './File.ts'

export function fromPath<T extends TemplateFile | TemplateDir | TemplateReference>(pathName: string): T {
	if (isTplFile(pathName)) {
		return TemplateFile.fromPath(pathName) as T
	}

	const stat = fs.statSync(pathName)
	const isDir = stat.isDirectory()

	if (isDir) {
		return TemplateDir.fromPath(pathName) as T
	}

	return TemplateReference.fromPath(pathName) as T
}
