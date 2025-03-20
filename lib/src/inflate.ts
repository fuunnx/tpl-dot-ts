import fs from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { transpile } from 'oxidase'

import { fallbackPrinter, jsonPrinter, yamlPrinter } from './printers/printers.ts'
import { combinePrinters } from './printers/lib.ts'
import { getSnapshotId, runWithContexts, type ProvidedContext } from './context.ts'
import { register } from 'node:module'
import { isTplFile, tplFileExtensionRegex } from './isTplFile.ts'

register(import.meta.url + '/../register.js')

function randomSuffix() {
  return `${Date.now()}-${Math.random()}`
}

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
    const contextsSnapshoptId = getSnapshotId(this.#contexts)

    // maybe memoize according to the current context stack ?
    return runWithContexts(this.#contexts, async () => {
      const originalFileName = path.join(this.#absolutePathName)
      const copyFileName = path.resolve(`${originalFileName}?context=${contextsSnapshoptId}.js`)
      
      try {
        const content = await fs.promises.readFile(originalFileName, 'utf-8')
        await fs.promises.writeFile(copyFileName, transpile(content))
        const { default: result } = await import(copyFileName)
        return result
      } finally {
        await fs.promises.rm(copyFileName)
      }
    })
  }

  async write(outputDir: string, outputFileName?: string) {
    const result = await this.#inflate()

    const fileName = path.basename(this.#absolutePathName)
    const finalFileName = fileName.replace(tplFileExtensionRegex, '')
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
    const tmpOutput = `${tmpdir()}/tpl.ts-${randomSuffix()}`
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

const printer = combinePrinters([yamlPrinter(), jsonPrinter(), fallbackPrinter()])

/** same version as `inflate`, but async for better performance */
async function inflateAsync(absolutePathName: string) {
  if(isTplFile(absolutePathName)) {
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
export const Tpl = {
  from(absolutePathName: string) {
    if(isTplFile(absolutePathName)) {
      return new InflatableFile(absolutePathName)
    }

    const stat = fs.statSync(absolutePathName)
    const isDir = stat.isDirectory()

    if(isDir) {
      return new InflatableDir(absolutePathName)
    }

    return new NonInflatable(absolutePathName)
  }
}
