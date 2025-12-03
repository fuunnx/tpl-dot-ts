#!/usr/bin/env -S npx tsx

import {
	createContext,
	defineFile,
	PrinterContext,
	runWithContexts,
	isPlainObject,
	defineDir,
	meta,
	yamlPrinter,
} from 'tpl-dot-ts'

const HostsRegistryContext = createContext<Set<string>>('hosts registry')

export function toIni(data: Record<string, unknown>): string {
	return Object.entries(data)
		.filter(([key]) => !key.startsWith('__meta_') && !key.startsWith('#'))
		.map(([key, value]) => `${key}=${value}`)
		.join('\n')
}

const printerContext = new PrinterContext([
  yamlPrinter({ interpretHashAsComments: true }),
	{
		name: 'context',
		async print(fileName, getData) {
      if(!fileName.endsWith('.ini')) return

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
	},
])

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

	'# some comment': '#',
	'# some disabled code': {
		hello: 'world',
		'with nested comment': [
			'# some nested comment #',
			'# some commented string',
			'some value',
		],
	},
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
