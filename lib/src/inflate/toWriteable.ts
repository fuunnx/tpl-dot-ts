import path from 'node:path';
import { combinePrinters } from '../printers/lib.ts';
import { fallbackPrinter, jsonPrinter, yamlPrinter } from '../printers/printers.ts';
import { familySym, kindSym, Taxonomy, type Inflate, type Inflatable, type Writeable, type WriteableDir, type WriteableFile, type WriteableReference } from '../types.ts';
import { mapValuesAsync } from '../lib/mapValuesAsync.ts';

const printer = combinePrinters([
  yamlPrinter(),
  jsonPrinter(),
  fallbackPrinter(),
])
function print(outputFileName: string, content: unknown) {
  const fileName = path.basename(outputFileName)
  const printedValue = printer.print(fileName, content)

  if (printedValue === null) {
    throw new Error(
      `No printer found for ${outputFileName} and value of type ${typeof content}. Printer used: ${printer.name}`,
    )
  }

  return printedValue
}

function isInflatable(value: unknown): value is Inflatable {
  return (
    value !== null &&
    typeof value === 'object' &&
    familySym in value &&
    value[familySym] === Taxonomy.FamilyEnum.inflatable
  )
}
function isWriteable(value: unknown): value is Writeable {
  return (
    value !== null &&
    typeof value === 'object' &&
    familySym in value &&
    value[familySym] === Taxonomy.FamilyEnum.writeable
  )
}

export async function toWritable<T extends Inflatable>(
  inflatable: T,
  outputFileName: string,
): Promise<Inflate<T>> {
  if (inflatable[kindSym] === Taxonomy.KindEnum.file) {
    let content = await inflatable.content()

    if (isInflatable(content)) {
      return (await toWritable(content, outputFileName)) as Inflate<T>
    }
    if (isWriteable(content)) {
      return content as Inflate<T>
    }

    return {
      [familySym]: Taxonomy.FamilyEnum.writeable,
      [kindSym]: Taxonomy.KindEnum.file,
      content: print(outputFileName, content),
    } satisfies WriteableFile as Inflate<T>
  }

  if (inflatable[kindSym] === Taxonomy.KindEnum.reference) {
    return {
      [familySym]: Taxonomy.FamilyEnum.writeable,
      [kindSym]: Taxonomy.KindEnum.reference,
      path: await inflatable.content(),
    } satisfies WriteableReference as Inflate<T>
  }

  if (inflatable[kindSym] === Taxonomy.KindEnum.dir) {
    const content: WriteableDir['content'] = await mapValuesAsync(
      await inflatable.content(),
      (value, key) => {
        return toWritable(value, key)
      },
    )

    return {
      [familySym]: Taxonomy.FamilyEnum.writeable,
      [kindSym]: Taxonomy.KindEnum.dir,
      content,
    } satisfies WriteableDir as Inflate<T>
  }

  throw new Error(`Unknown kind ${inflatable[kindSym]}`)
}
