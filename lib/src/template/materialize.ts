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
import { controlFlow } from '../printers/controlFlow.ts'

async function print(
	outputFileName: string,
	getContent: () => unknown,
): Promise<string | null | Materialized | Template> {
	const fileName = path.basename(outputFileName)
	const printer = combinePrinters(PrinterContext.getContextValue())

	let firstContent
	let printedValue = await printer.print(fileName, async () => {
		firstContent = await getContent()
		return firstContent
	})
	if (controlFlow.isBreak(printedValue)) printedValue = printedValue.value

	if (typeof printedValue === 'string') return printedValue
	if (printedValue === null) return null

	if (isTemplate(printedValue)) return printedValue
	if (isMaterialized(printedValue)) return printedValue

	throw new Error(
		`Invalid result type ${printItemType(printedValue)} found for ${JSON.stringify(outputFileName)} and value of type "${printItemType(firstContent)}". Printer used: ${printer.name}. Valid types are: string | null`,
	)
}

function printItemType(item: unknown) {
	if (item === null) return 'null'
	if (typeof item === 'object') return item.constructor.name
	return typeof item
}

export function isTemplate(value: unknown): value is Template {
	return (
		value !== null &&
		typeof value === 'object' &&
		stateSym in value &&
		value[stateSym] === Taxonomy.StateEnum.template
	)
}
export function isMaterialized(value: unknown): value is Materialized {
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
			const materializedContent = await print(outputFileName, template.content)

			if (isTemplate(materializedContent)) {
				return (await materialize(
					materializedContent,
					outputFileName,
				)) as Materialize<T>
			}
			if (isMaterialized(materializedContent)) {
				return materializedContent as Materialize<T>
			}

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
