import fs from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import yaml from 'yaml'


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
    return inflateFile({ input: fileName.toString(), output: tmpOutput })
  }))

  await fs.promises.mkdir(output, { recursive: true })
  await fs.promises.rename(tmpOutput, output)
}

async function inflateFile(params: InflateParams) {
  const { input, output } = params
  const fileName = input
  const isTpl = fileName.endsWith('.tpl.ts') || fileName.endsWith('.tpl.js')
  
  if(!isTpl) {
    await fs.promises.copyFile(
      path.join(input, fileName),
      path.join(output, fileName)
    )
    return
  }
  
  const { default: result } = await import(path.join(input, fileName.replace('.ts', '.js')))
  
  const finalFileName = fileName.replace('.tpl.ts', '').replace('.tpl.js', '')
  
  if(typeof result === 'string') {
    await fs.promises.writeFile(path.join(output, finalFileName), result)
    return
  }

  if(finalFileName.endsWith('.yml')) {
    await fs.promises.writeFile(path.join(output, finalFileName), yaml.stringify(result, {}))
    return
  }

  if(finalFileName.endsWith('.json')) {
    await fs.promises.writeFile(path.join(output, finalFileName), JSON.stringify(result, null, 2))
    return
  }
}
