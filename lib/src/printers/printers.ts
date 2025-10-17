import yaml from 'yaml'
import type { Printer } from './types.ts'

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

	export type Printable = TplTs.Printers[keyof TplTs.Printers]['data']
}

export function yamlPrinter(): Printer {
	return {
		name: 'yaml',
		print: (fileName, data, next) => {
			if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
				if (typeof data === 'string') return next(data)
				if (typeof data === 'object') {
          return next(
						yaml
							.stringify(data)
							// replace all `key: {}` with `key:`
							.replaceAll(/(.*:) \{\}/gi, '$1')
					)
        }
			}

			return next(data)
		},
	}
}

export function jsonPrinter(): Printer {
	return {
		name: 'json',
		print: (fileName, data, next) => {
			if (fileName.endsWith('.json')) {
				if (typeof data === 'string') return next(data)
				if (typeof data === 'object') return next(JSON.stringify(data, null, 2))
			}

			return next(data)
		},
	}
}


