import type { Printer } from './types.ts'
import { isPlainObject } from '../lib/predicates.ts'

export namespace TplTs {
	export interface Printers {
		fallback: {
			data: string
		}
		yaml: {
			data: string | Record<string, unknown>
		}
		json: {
			data: string | Record<string, unknown>
		}
		// dir: {
		//   'data': string | Record<string, unknown>
		// }
	}
}

export type Printable = TplTs.Printers[keyof TplTs.Printers]['data']

export { yamlPrinter } from './yaml/index.ts'

export function jsonPrinter(): Printer {
	return {
		name: 'json',
		print: async (fileName, getData) => {
			if (fileName.endsWith('.json')) {
				const data = await getData((x) => isPlainObject(x) || Array.isArray(x))
				return JSON.stringify(data, null, 2)
			}
		},
	}
}
