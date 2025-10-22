import type { Materialized, Template } from 'src/types.ts'
import type { Printer } from './types.ts'
import { isMaterialized, isTemplate } from 'src/template/materialize.ts'

export function combinePrinters(printers: Printer[], name?: string): Printer {
	return {
		name:
			name ??
			`combinePrinters(${printers.map((printer) => printer.name ?? '<anonymous>').join(', ')})`,
		async print(fileName, getData): Promise<unknown> {
      if(!printers.length) return getData()

      const [first, ...others] = printers

      let print = async () => await first!.print(fileName, async () => {
        const result = await getData()
        if(isPassThrough(result)) throw result // prevent further computation
        return result
      })

      for (const printer of others) {
        let previousPrint = print
        print = async () => await printer.print(fileName, previousPrint)
      }

      try {
        return await print()
      } catch(error) {
        if(isPassThrough(error)) return error
        throw error
      }
		},
	}
}

function isPassThrough(value: unknown): value is Template | Materialized {
  return isTemplate(value) || isMaterialized(value)
}
