import { TemplateDir } from './template/Dir.ts'
import {
	type TemplateDirContent,
	type ITemplateFile,
	Taxonomy,
} from './types.ts'
import { stateSym, kindSym } from './internal.ts'

export function defineDir<T extends TemplateDirContent>(
	entries: T,
): TemplateDir<T> {
	return TemplateDir.fromEntries(entries)
}

export function defineFile<T extends unknown>(
	content: T | (() => T),
): ITemplateFile {
	return {
		[stateSym]: Taxonomy.StateEnum.template,
		[kindSym]: Taxonomy.KindEnum.file,
		content() {
			if (typeof content === 'function') {
				// @ts-expect-error content may be a function expecting args
				return content()
			} else {
				return content
			}
		},
	}
}
