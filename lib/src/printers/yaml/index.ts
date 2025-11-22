import YAML from 'yaml'
import type { Printer } from '../types.ts'
import { isPlainObject } from '../../lib/predicates.ts'

export function yamlPrinter(): Printer {
	return {
		name: 'yaml',
		print: async (fileName, getData) => {
			if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
				const data = await getData((x) => isPlainObject(x) || Array.isArray(x))

				return (
					YAML.stringify(data)
						// replace all `key: {}` with `key:`
						.replaceAll(/(.*:) \{\}/gi, '$1')
				)
			}
		},
	}
}
