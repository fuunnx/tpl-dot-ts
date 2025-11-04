#!/usr/bin/env -S npx tsx

import {
	createContext,
	defineFile,
	PrinterContext,
	runWithContexts,
	isPlainObject,
	defineDir,
} from 'tpl-dot-ts'

const HostsRegistryContext = createContext<Set<string>>('hosts registry')

export function toIni(data: Record<string, unknown>): string {
	return Object.entries(data)
		.map(([key, value]) => `${key}=${value}`)
		.join('\n')
}

const printerContext = PrinterContext.appendedBy({
	name: 'context',
	async print(fileName, getData) {
		const registry = new Set<string>()
		const data = await runWithContexts(
			[new HostsRegistryContext(registry)],
			() => getData(isPlainObject),
		)

		return `
# Hosts listed in this file: ${Array.from(registry.values()).join(', ')}
${toIni(data)}
`
	},
})

defineDir(() => {
	return {
		'./config.ini': defineFile(() => {
			const dbConfig = {
				host: 'localhost',
				port: '5432',
			}

			// append metadata
			HostsRegistryContext.getContextValue().add(dbConfig.host)

			return dbConfig
		}),
	}
})
	.withContext(printerContext)
	.write('./generated', import.meta.dirname)

// The file output will be:
//
// # Hosts listed in this file: localhost
// host=localhost
// port=5432
//
