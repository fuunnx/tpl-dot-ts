import { createContext } from 'tpl-dot-ts'

type ConfigShape = { name: string }

export class Config extends createContext<ConfigShape>('config', () => ({ name: 'World' })) {
  // Add an initializer for convenience
  static init(data: ConfigShape) {
    return new Config(data)
  }
}
