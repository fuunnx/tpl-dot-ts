import fs from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { fallbackPrinter, jsonPrinter, yamlPrinter } from './printers/printers.ts'
import { combinePrinters } from './printers/lib.ts'
import { runWithContexts, type ProvidedContext } from './context.ts'



interface Inflatable {
  kind: 'inflatable'

  withContext(context: ProvidedContext): this
  write(outputDir: string, outputFileName?: string): Promise<void> 
}

class NonInflatable implements Inflatable {
  kind = 'inflatable' as const

  #absolutePathName: string

  constructor(absolutePathName: string) {
    this.#absolutePathName = absolutePathName
  }

  withContext(..._contexts: ProvidedContext[]) {
    return this
  }
  
  async write(outputDir: string, outputFileName?: string) {
    await fs.promises.copyFile(
      path.join(this.#absolutePathName),
      path.join(outputDir, outputFileName ?? path.basename(this.#absolutePathName))
    )
  }
}

class InflatableFile {
  kind = 'inflatable' as const

  #absolutePathName: string
  #contexts: ProvidedContext[]

  constructor(absolutePathName: string, contexts: ProvidedContext[] = []) {
    this.#absolutePathName = absolutePathName
    this.#contexts = contexts
  }

  withContext(...contexts: ProvidedContext[]) {
    return new InflatableFile(this.#absolutePathName, [...this.#contexts, ...contexts])
  }

  async #inflate() {
    return runWithContexts(this.#contexts, async () => {
      const { default: result } = await import(path.join(this.#absolutePathName.replace(/\.ts$/, '.js')))
      return result
    })
  }

  async write(outputDir: string, outputFileName?: string) {
    const result = await this.#inflate()

    const fileName = path.basename(this.#absolutePathName)
    const finalFileName = fileName.replace(/\.tpl\.[tj]s$/, '')
    const printedValue = printer.print(finalFileName, result)

    if(printedValue === null) {
      throw new Error(`No printer found for ${this.#absolutePathName} and value of type ${typeof result}. Printer used: ${printer.name}`)
    }
    
    return fs.promises.writeFile(path.join(outputDir, outputFileName ?? finalFileName), printedValue)
  }

}

class InflatableDir {
  kind = 'inflatable' as const

  #absolutePathName: string
  #contexts: ProvidedContext[]

  constructor(absolutePathName: string, contexts: ProvidedContext[] = []) {
    this.#absolutePathName = absolutePathName
    this.#contexts = contexts
  }


  withContext(...contexts: ProvidedContext[]) {
    return new InflatableDir(this.#absolutePathName, [...this.#contexts, ...contexts])
  }

  async #inflate() {
    // TODO use contexts
    const inputFiles = fs.readdirSync(
      this.#absolutePathName, 
      { recursive: false }
    )

    const files = await Promise.all(inputFiles.map(async fileName => {
      fileName = fileName.toString()
      const inflatable = await inflateAsync(path.join(this.#absolutePathName, fileName))

      // ignore if file looks like `(**)` or `(**).*`
      const isIgnored = fileName.match(/^\(.*\)(..+)?$/)
      if(isIgnored) return null
      return {
        fileName,
        inflatable: inflatable.withContext(...this.#contexts)
      }
    }))

    return files
  }

  async write(outputDir: string) {
    const tmpOutput = `${tmpdir()}/tpl.ts-${Date.now()}.${Math.random()}`
    await fs.promises.mkdir(tmpOutput, { recursive: true })
  
    const files = await this.#inflate()

    await Promise.all(files.map(async file => {
      if(!file) return
      if(file.inflatable instanceof InflatableDir) {
        return file.inflatable.write(path.join(tmpOutput, file.fileName))
      }
      return file.inflatable.write(tmpOutput)
    }))
  
    await fs.promises.mkdir(outputDir, { recursive: true })
    await fs.promises.rm(outputDir, { recursive: true })
    await fs.promises.rename(tmpOutput, outputDir)
  }
}

const printer = combinePrinters([yamlPrinter, jsonPrinter, fallbackPrinter])

/** same version as `inflate`, but async for better performance */
async function inflateAsync(absolutePathName: string) {
  const isTpl = absolutePathName.endsWith('.tpl.ts') || absolutePathName.endsWith('.tpl.js')
  if(isTpl) {
    return new InflatableFile(absolutePathName)
  }

  const stat = await fs.promises.stat(absolutePathName)
  const isDir = stat.isDirectory()

  if(isDir) {
    return new InflatableDir(absolutePathName)
  }

  return new NonInflatable(absolutePathName)
}


/** same version as `inflateAsync`, but sync for end user convenience */
export function inflate(absolutePathName: string) {
  const isTpl = absolutePathName.endsWith('.tpl.ts') || absolutePathName.endsWith('.tpl.js')
  if(isTpl) {
    return new InflatableFile(absolutePathName)
  }

  const stat = fs.statSync(absolutePathName)
  const isDir = stat.isDirectory()

  if(isDir) {
    return new InflatableDir(absolutePathName)
  }

  return new NonInflatable(absolutePathName)
}
