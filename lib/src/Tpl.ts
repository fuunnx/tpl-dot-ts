import path from 'node:path'

import { TemplateDir } from './template/Dir.ts'
import { TemplateReference } from './template/Reference.ts'
import { normalizePath } from './lib/normalizePath.ts'
import { TemplateFile } from './template/File.ts'
import { fromPath } from './template/fromPath.ts'

export const Tpl = {
	async fromPath(
		importMeta: { url: string },
		pathName: string,
	): Promise<TemplateFile | TemplateReference | TemplateDir> {
		pathName = path.join(path.dirname(normalizePath(importMeta.url)), pathName)
		return fromPath(pathName)
	},
}
