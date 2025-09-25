import { createContext } from 'tpl-dot-ts'

interface ConfigShape {
  name: string 
}

export class Config extends createContext<ConfigShape>('config') {}
