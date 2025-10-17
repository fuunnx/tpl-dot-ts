import { Config } from '../config.ts'
import { defineDir, defineFile } from 'tpl-dot-ts'

export default function Tpl() {
	const config = Config.getContextValue()

  if(config.target === 'integ') {
    return defineDir({
      './integ-only.json': defineFile({
        a: 1,
        b: 2,
      }),
    })
  }
  return null
}
