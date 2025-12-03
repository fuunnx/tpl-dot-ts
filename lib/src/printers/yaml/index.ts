import type { Printer } from '../types.ts'
import { isPlainObject } from '../../lib/predicates.ts'
import { yamlStringify } from './stringify'


export type YamlPrinterConfig = {
	interpretHashAsComments?: boolean
}
export function yamlPrinter(config?: YamlPrinterConfig): Printer {
	return {
		name: 'yaml',
		print: async (fileName, getData) => {
			if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
				const data = await getData((x) => isPlainObject(x) || Array.isArray(x))
        return (
          yamlStringify(data, config)
            // replace all `key: {}` with `key:`
            .replaceAll(/(.*:) \{\}/gi, '$1')
        )
			}
		},
	}
}
