import fs from 'node:fs'
import { tmpdir, type } from 'node:os'
import path from 'node:path'

import { fallbackPrinter, jsonPrinter, yamlPrinter } from './printers/printers.ts'
import { combinePrinters } from './printers/lib.ts'


type InflateParams = {
  input: string
  output: string
}
export async function inflateDir(params: InflateParams) {
  const { input, output } = params

  const inputFiles = fs.readdirSync(
    path.join(input), 
    { recursive: true }
  )


  const tmpOutput = `${tmpdir()}/tpl.ts-${Date.now()}.${Math.random()}`
  await fs.promises.mkdir(tmpOutput, { recursive: true })

  await Promise.all(inputFiles.map(async fileName => {
    return inflateFile({ input: path.join(input, fileName.toString()), output: tmpOutput })
  }))

  await fs.promises.mkdir(output, { recursive: true })
  await fs.promises.rm(output, { recursive: true })
  await fs.promises.rename(tmpOutput, output)
}

const printer = combinePrinters([yamlPrinter, jsonPrinter, fallbackPrinter])
async function inflateFile(params: InflateParams) {
  const { input, output } = params

  const dirName = path.dirname(input)
  const fileName = path.basename(input)
  const isTpl = fileName.endsWith('.tpl.ts') || fileName.endsWith('.tpl.js')
  
  if(!isTpl) {
    await fs.promises.copyFile(
      path.join(dirName, fileName),
      path.join(output, fileName)
    )
    return
  }

  const { default: result } = await import(path.join(dirName,fileName.replace('.ts', '.js')))
  
  const finalFileName = fileName.replace('.tpl.ts', '').replace('.tpl.js', '')
  

  const printedValue = printer.print(finalFileName, result)

  if(printedValue === null) {
    throw new Error(`No printer found for ${fileName} and value of type ${typeof result}. Printer used: ${printer.name}`)
  }

  await fs.promises.writeFile(
    path.join(output, finalFileName),
    printedValue
  )
}


