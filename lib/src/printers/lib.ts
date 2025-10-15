import type { Printer } from './types.ts'
export function combinePrinters(printers: Printer[], name?: string): Printer {
	return {
		name:
			name ??
			`combinePrinters(${printers.map((printer) => printer.name ?? '<anonymous>').join(', ')})`,
		async print(fileName: string, data: unknown) {
			let result: string | null = null

			for (const printer of printers) {
				if (result === null) {
					result = await printer.print(fileName, data)
				}
			}

			return result
		},
	}
}
