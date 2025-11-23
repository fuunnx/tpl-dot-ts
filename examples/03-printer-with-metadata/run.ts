#!/usr/bin/env -S npx tsx

import {
	createContext,
	defineFile,
	PrinterContext,
	runWithContexts,
	isPlainObject,
	defineDir,
	meta,
} from 'tpl-dot-ts'

const HostsRegistryContext = createContext<Set<string>>('hosts registry')

export function toIni(data: Record<string, unknown>): string {
	return Object.entries(data)
		.filter(([key]) => !key.startsWith('__meta_'))
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

const dbConfig = {
	...meta.comment(`
Database configuration

With sensible defaults for dev mode

`),
	host: 'localhost',
	port: meta.withCommentInline('5432', 'Default port'),

	...meta.disabled(
		{
			user: 'postgres',
			password: 'my-secret-password',
		},
		'Uncomment in dev',
	),
}

defineDir(() => {
	return {
		'./config.ini': defineFile(() => {
			// append metadata
			HostsRegistryContext.getContextValue().add(dbConfig.host)

			return dbConfig
		}),

		'./dbConfigWithComments.yaml': defineFile(() => {
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
