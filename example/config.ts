import {createContext, memoize, overloadConfig, parseArgs} from 'tpl.ts';

export const args = parseArgs({
	input: './input',
	output: './output',
	target: ['development', 'integ', 'preproduction', 'production'] as const,
	isLocal: true,
	isPersistant: true,
	isApiDev: true,
})

export type Target = 'development' | 'integ' | 'preproduction' | 'production'

function createSelect<T extends string>(target: T) {
	return function select<U>(conf: Partial<Record<T, U>> & { default: U }): U {
		return conf[target] ?? conf.default
	}
}

export const createConfig = memoize((target: Target) => {
	const selectWithTarget = createSelect(args.target)

	return {
		target,
		prefix: 'nartex',
		host: 'nartex.fr',
		hostName: 'nartex.fr',

		docker: {
			front_version: selectWithTarget({
				default: 'release/3-4',
				production: 'v3-4-0',
				preproduction: 'v3-4-0',
			}),
			api_version: selectWithTarget({
				default: 'release/3-4-debug',
				production: 'v3-4-0-release',
				preproduction: 'v3-4-0-release',
			}),
			typesense_version: selectWithTarget({
				default: '1-2-3',
			}),
			citus_version: selectWithTarget({
				default: 'internal-todo',
				production: 'todo',
				preproduction: 'todo',
			}),
			minio_version: selectWithTarget({
				default: 'RELEASE.2022-08-26T19-53-15Z.fips',
			}),
		},

		vars: overloadConfig(target, {
			host: {
				default: 'realty.test',
				development: 'realty.test',
				integ: 'realty.integ.nartest.fr',
				preproduction: 'preprod.realty.fr',
				production: 'realty.fr',
			},

			typesense_api_key: {
				default: '',
				preproduction: 'typesense_api_key',
				production: 'typesense_api_key_prod',
			},

			user: {
				default: '',
				integ: '1002:1002',
			},
		}),
	}
})

export const configContext =
	createContext<ReturnType<typeof createConfig>>('config')
