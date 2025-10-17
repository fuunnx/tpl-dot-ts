import { Config } from '../config.ts'
import { defineFile } from 'tpl-dot-ts'

export default function Tpl() {
	const config = Config.getContextValue()

  if(config.target === 'integ') {
    return defineFile('This is an integ file only')
  }
  return null
}
