import path from 'node:path'
import { combinePrinters } from '../printers/lib.ts'
import {
	Taxonomy,
	type Materialize,
	type Template,
	type Materialized,
	type MaterializedDir,
	type MaterializedFile,
	type MaterializedReference,
} from '../types.ts'
import { stateSym, kindSym } from '../internal.ts'
import { mapValuesAsync } from '../lib/mapValuesAsync.ts'
import { runWithContexts } from '../context.ts'
import { PrinterContext } from '../printers/PrinterContext.ts'

async function print(outputFileName: string, content: unknown) {
	const fileName = path.basename(outputFileName)
	const printer = combinePrinters(PrinterContext.getContextValue())
	const printedValue = await printer.print(fileName, content, (value) => Promise.resolve(value))

  if(typeof printedValue === 'string') {
    return printedValue
  }

	if (printedValue === null) {
    return null
  }

  throw new Error(
    `Invalid result type ${typeof printedValue} found for ${JSON.stringify(outputFileName)} and value of type "${typeof content}". Printer used: ${printer.name}. Valid types are: string | null`,
  )
}

function isTemplate(value: unknown): value is Template {
	return (
		value !== null &&
		typeof value === 'object' &&
		stateSym in value &&
		value[stateSym] === Taxonomy.StateEnum.template
	)
}
function isMaterialized(value: unknown): value is Materialized {
	return (
		value !== null &&
		typeof value === 'object' &&
		stateSym in value &&
		value[stateSym] === Taxonomy.StateEnum.materialized
	)
}

export async function materialize<T extends Template>(
	template: T,
	outputFileName: string,
): Promise<Materialize<T>> {
	return runWithContexts(template.contexts ?? [], async () => {
		if (template[kindSym] === Taxonomy.KindEnum.file) {
			let content = await template.content()

			if (isTemplate(content)) {
				return (await materialize(content, outputFileName)) as Materialize<T>
			}
			if (isMaterialized(content)) {
				return content as Materialize<T>
			}

      const materializedContent = await print(outputFileName, content)
			return {
				[stateSym]: Taxonomy.StateEnum.materialized,
				[kindSym]: Taxonomy.KindEnum.file,
				content: materializedContent,
			} satisfies MaterializedFile as Materialize<T>
		}

		if (template[kindSym] === Taxonomy.KindEnum.reference) {
			return {
				[stateSym]: Taxonomy.StateEnum.materialized,
				[kindSym]: Taxonomy.KindEnum.reference,
				path: await template.content(),
			} satisfies MaterializedReference as Materialize<T>
		}

		if (template[kindSym] === Taxonomy.KindEnum.dir) {
			const content: MaterializedDir['content'] = await mapValuesAsync(
				await template.content(),
				(value, key) => {
					return materialize(value, key)
				},
			)

			return {
				[stateSym]: Taxonomy.StateEnum.materialized,
				[kindSym]: Taxonomy.KindEnum.dir,
				content,
			} satisfies MaterializedDir as Materialize<T>
		}

		throw new Error(`Unknown kind ${template[kindSym]}`)
	})
}
