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
	const printedValue = await printer.print(fileName, content)

	if (printedValue === null) {
		throw new Error(
			`No printer found for ${JSON.stringify(outputFileName)} and value of type "${typeof content}". Printer used: ${printer.name}`,
		)
	}

	return printedValue
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

			return {
				[stateSym]: Taxonomy.StateEnum.materialized,
				[kindSym]: Taxonomy.KindEnum.file,
				content: await print(outputFileName, content),
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
