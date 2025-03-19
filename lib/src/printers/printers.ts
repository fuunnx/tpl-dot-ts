import yaml from 'yaml';
import { type Printer } from './types.ts';


export const yamlPrinter: Printer = {
  name: 'yaml',
  print: (fileName: string, data: unknown) => {
    if(fileName.endsWith('.yml') ||  fileName.endsWith('.yaml')) {
      if(typeof data === 'string') return data
      if(typeof data === 'object') return yaml.stringify(data)
    }

    return null
  }
}

export const jsonPrinter: Printer = {
  name: 'json',
  print: (fileName: string, data: unknown) => {
    if(fileName.endsWith('.json')) {
      if(typeof data === 'string') return data
      if(typeof data === 'object') return JSON.stringify(data, null, 2)
    }

    return null
  }
}

export const fallbackPrinter: Printer = {
  name: 'fallback',
  print: (_fileName: string, data: unknown) => {
    if(typeof data === 'string') return data
    return null
  }
}
