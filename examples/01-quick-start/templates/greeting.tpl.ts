import { defineFile } from 'tpl-dot-ts'
import { Config } from '../config.ts'

// The default export defines the output. Here, it's a single file.
export default defineFile(() => {
  const config = Config.getContextValue()
  return `Hello, ${config.name}!`
})
