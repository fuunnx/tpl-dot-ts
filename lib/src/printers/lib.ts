import type { Materialized, Template } from 'src/types.ts'

import type { Accept, GetData, Printer } from './types.ts'
import { isMaterialized, isTemplate } from 'src/template/materialize.ts'
import { controlFlow } from './controlFlow.ts'

export function combinePrinters(printers: Printer[], name?: string) {
	return {
		name:
			name ??
			`combinePrinters(${printers.map((printer) => printer.name ?? '<anonymous>').join(', ')})`,
		async print(
			fileName: string,
			getData: () => Promise<unknown>,
		): Promise<unknown> {
			let print = getData

			for (const printer of printers) {
				let previousPrint = print
				print = async () => {
					try {
						const getData: GetData = async function <T>(accept?: Accept<T>) {
							const result = await previousPrint()
							if (isPassThrough(result)) throw controlFlow.break(result)
							if (accept == null) return result
							if (!accept(result)) throw controlFlow.continue(result)
							return result
						}
						const res = await printer.print(fileName, getData)
						if (res === getData) return await previousPrint()
						return res
					} catch (error) {
						if (controlFlow.isBreak(error)) throw error
						if (controlFlow.isContinue(error)) return error
						throw error
					}
				}
			}

			try {
				return await print()
			} catch (error) {
				if (controlFlow.isBreak(error)) return error
				throw error
			}
		},
	}
}

function isPassThrough(value: unknown): value is Template | Materialized {
	return isTemplate(value) || isMaterialized(value)
}
