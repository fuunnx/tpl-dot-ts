import { createContext } from 'tpl-dot-ts'
import { parseArgs } from 'node:util'
import { select } from './utils/select.ts'

const parsedArgs = parseArgs({
	options: {
		isPersistant: {
			type: 'boolean',
			default: true,
		},
		isApiDev: {
			type: 'boolean',
			default: true,
		},
	},
	strict: true,
})

export const args = parsedArgs.values

export type Target = 'development' | 'integ' | 'preproduction' | 'production'

function createConfig(target: Target) {
	return {
		target,
		prefix: `demo-${target}`,
		host: 'demo.fr',
		hostName: 'demo.fr',

		docker: {
			front_version: select(target, {
				default: 'release/3-4',
				production: 'v3-4-0',
				preproduction: 'v3-4-0',
			} as const),
			api_version: select(target, {
				default: 'release/3-4-debug',
				production: 'v3-4-0-release',
				preproduction: 'v3-4-0-release',
			} as const),
			typesense_version: select(target, {
				default: '1-2-3',
			} as const),
			citus_version: select(target, {
				default: 'internal-todo',
				production: 'todo',
				preproduction: 'todo',
			} as const),
			minio_version: select(target, {
				default: 'RELEASE.2022-08-26T19-53-15Z.fips',
			} as const),
		},

		vars: {
			host: select(target, {
				default: 'demo.test',
				development: 'demo.test',
				integ: 'demo.integ.fr',
				preproduction: 'demo.preprod.fr',
				production: 'demo.fr',
			} as const),

			typesense_api_key: select(target, {
				default: '',
				preproduction: 'typesense_api_key',
				production: 'typesense_api_key_prod',
			} as const),

			user: select(target, {
				default: '',
				integ: '1002:1002',
			} as const),
		},
	} as const
}

export class Config extends createContext('config', () =>
	createConfig('production'),
) {
	static init(target: Target) {
		return new Config(createConfig(target))
	}
}
