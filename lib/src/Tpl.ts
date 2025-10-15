import path from 'node:path'

import { TemplateDir } from './template/Dir.ts'
import { TemplateReference } from './template/Reference.ts'
import { TemplateFile } from './template/File.ts'
import { fromPath } from './template/fromPath.ts'

export const Tpl = {
	fromPath<T extends TemplateFile | TemplateDir | TemplateReference>(
		pathName: string,
    relativeTo?: string
	): T {
		pathName = relativeTo ? path.join(relativeTo, pathName) : pathName
		return fromPath(pathName)
	},
}
