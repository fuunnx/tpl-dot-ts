import { defineDir, defineFile } from 'tpl.ts'

export default defineDir({
  './merged-in-fs.ts': defineFile('export const test = `coucou`'),
})
