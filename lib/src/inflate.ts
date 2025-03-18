import fs from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import yaml from 'yaml'


type MorphParams = {
  input: string
  output: string
}
export async function inflateDir(params: MorphParams) {
  const { input, output } = params

  const inputFiles = fs.readdirSync(
    path.join(input), 
    { recursive: true }
  )
  const tmpOutput = `${tmpdir()}/${Date.now()}.${Math.random()}`
  await fs.promises.mkdir(tmpOutput, { recursive: true })

  await Promise.all(inputFiles.map(async fileName => {
    fileName = fileName.toString()
    const isTpl = fileName.endsWith('.tpl.ts') || fileName.endsWith('.tpl.js')
    
    if(!isTpl) {
      await fs.promises.copyFile(
        path.join(input, fileName),
        path.join(tmpOutput, fileName)
      )
      return
    }
    
    const { default: result } = await import(path.join(input, fileName.replace('.ts', '.js')))
    
    const finalFileName = fileName.replace('.tpl.ts', '').replace('.tpl.js', '')
    
    if(typeof result === 'string') {
      await fs.promises.writeFile(path.join(tmpOutput, finalFileName), result)
      return
    }
  
    if(finalFileName.endsWith('.yml')) {
      await fs.promises.writeFile(path.join(tmpOutput, finalFileName), yaml.stringify(result, {}))
      return
    }
  
    if(finalFileName.endsWith('.json')) {
      await fs.promises.writeFile(path.join(tmpOutput, finalFileName), JSON.stringify(result, null, 2))
      return
    }
  }))

  await fs.promises.mkdir(output, { recursive: true })
  await fs.promises.rename(tmpOutput, output)
}

