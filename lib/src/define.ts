import { TemplateDir } from './template/Dir.ts'
import { TemplateFile } from './template/File.ts'
import {
	type TemplateDirContent,
} from './types.ts'


type Getter<T> = () => T | Promise<T>

export function defineDir<T extends TemplateDirContent>(
	entries: T | Getter<T>,
): TemplateDir<T> {
	return new TemplateDir<T>(typeof entries === 'function' ? entries : () => entries)
}

export function defineFile<T extends unknown>(
	content: T extends Function ? Getter<T> : T | Getter<T>,
): TemplateFile<T> {
	return new TemplateFile<T>(
    // @ts-expect-error the type is correct
    typeof content === 'function' ? content : () => content
  )
}

