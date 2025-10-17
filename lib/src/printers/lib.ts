import type { Printer } from './types.ts'
export function combinePrinters(printers: Printer[], name?: string): Printer {
	return {
		name:
			name ??
			`combinePrinters(${printers.map((printer) => printer.name ?? '<anonymous>').join(', ')})`,
		async print(fileName, data, next) {
      const stack = [...printers]
      async function onNext(result: unknown) {
        const printer = stack.shift()
        if (!printer) return result
        return printer.print(fileName, result, onNext)
      }

			const result = await onNext(data)
			return next(result)
		},
	}
}
