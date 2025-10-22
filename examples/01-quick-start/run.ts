#!/usr/bin/env -S npx tsx

// ⬆️ The line above is a shebang. It tells the system to execute this
// file using 'tsx', a tool that can run TypeScript files directly.

import { Tpl, defineDir, PrinterContext, type Printer } from 'tpl-dot-ts'
import { Config } from './config.ts'

async function main() {
	// 1. Load the entire 'templates' directory.
	const template = await Tpl.fromPath( './templates', import.meta.dirname)

  // (optional) Create your own printers
  const upperCaseFrenchPrinter: Printer = {
    name: 'uppercase french',

    async print(fileName, getData) {
      const data = await getData()
      if (fileName === 'greeting' && typeof data === 'string') {
        return data
          .toLocaleUpperCase('fr-FR')
          .replace('HELLO', 'sAlUt')
      }

      return data
    },
  }

	// 2. Define the output structure, applying a different context for each language.
	const output = defineDir({
		english: template.withContext(
      new Config({ name: 'World' }),
    ),
		french: template.withContext(
			new Config({ name: 'Monde' }),
			PrinterContext.prependedBy(upperCaseFrenchPrinter),
		),
	})

	// 3. Write the result to the 'generated' directory.
	await output.write('./generated', import.meta.dirname)

	console.log('Done! Check the "generated" directory.')
}

main()
