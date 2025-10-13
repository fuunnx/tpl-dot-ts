#!/usr/bin/env -S npx tsx

// ⬆️ The line above is a shebang. It tells the system to execute this
// file using 'tsx', a tool that can run TypeScript files directly.

import { Tpl, defineDir, PrinterContext } from 'tpl-dot-ts'
import { Config } from './config.ts'

async function main() {
	// 1. Load the entire 'templates' directory.
	const template = await Tpl.from(import.meta, './templates')

	// 2. Define the output structure, applying a different context for each language.
	const output = defineDir({
		english: template.withContext(new Config({ name: 'World' })),
		french: template.withContext(
			new Config({ name: 'Monde' }),
			PrinterContext.prependedBy({
				name: 'uppercase french',
				print(fileName: string, data: unknown) {
					if (fileName === 'greeting') {
						return String(data)
							.toLocaleUpperCase('fr-FR')
							.replace('HELLO', 'SALUT')
					}
					return null
				},
			}),
		),
	})

	// 3. Write the result to the 'generated' directory.
	await output.write('./generated')

	console.log('Done! Check the "generated" directory.')
}

main()
