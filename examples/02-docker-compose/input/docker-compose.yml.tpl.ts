import {
	defineDockerCompose,
	defineDockerComposeService,
} from 'utils/docker.ts'
import { args, Config } from '../config.ts'
import flattenObject from '@stdlib/utils-flatten-object'

export default function Docker() {
	const config = Config.getContextValue()
	const { docker, vars, target } = config

	return defineDockerCompose({
		networks: {
			get proxy() {
				if (target === 'development') {
					return { driver: 'bridge' }
				} else {
					return { external: true }
				}
			},
		},

		get volumes() {
			if (target === 'development') {
				return {
					'app-public': {},
					'postgres-data': {},
					'pgadmin-data': {},
					'minio-data': {},
					'typesense-data': {},
					'acljs-data': {},
					'beanstalkd-data': {},
					'mail-data': {},
					'app-data': {},
					'history-data': {},
					'image-proxy-data': {},
					'percolate-data': {},
				}
			} else {
				return {
					'app-public': {},
				}
			}
		},

		services: {
			// ...autoImportServices('./services'),
			// ...proxy,
			// [`${prefix}-proxy`]: proxy,

			get db() {
				return defineDockerComposeService('db', {
					image: `registry.projects.demo.fr/demo/system/citus-postgis:${docker.citus_version}`,
					env_file: ['./environment/db.env'],
					user: vars.user || undefined,
					networks: ['default'],
					healthcheck: {
						test: ['CMD', 'pg_isready', '-U', 'postgres'],
						interval: '10s',
						timeout: '5s',
						retries: 5,
					},
					get volumes() {
						if (target === 'development') {
							return [
								'./config/citus/docker-entrypoint-initdb.d/multi-databases.sh:/docker-entrypoint-initdb.d/multi-databases.sh',
								'postgres-data:/var/lib/postgresql/data',
							]
						} else {
							return [
								'${STORAGE_DIRECTORY_PATH}/config/citus/docker-entrypoint-initdb.d/multi-databases.sh:/docker-entrypoint-initdb.d/multi-databases.sh',
								'${STORAGE_DIRECTORY_PATH}/data/postgres-data:/var/lib/postgresql/data',
							]
						}
					},
				})
			},

			get typesense() {
				return defineDockerComposeService('typesense', {
					image: `typesense/typesense:${docker.typesense_version}`,
					env_file: ['./environment/typesense.env'],
					networks: ['default', 'proxy'],
					ports: args.isApiDev ? ['8108:8108'] : undefined,
					// '# commentaire': { qqchose: 'autre' },
					depends_on: [],
					volumes: args.isPersistant
						? [
								target === 'development'
									? 'typesense-data:/data'
									: '${STORAGE_DIRECTORY_PATH}/data/typesense-data:/data',
							]
						: undefined,
				})
			},

			get minio() {
				if (target !== 'development') return {}

				return defineDockerComposeService('minio', {
					image: `minio/minio:${docker.minio_version}`,
					command: 'server /data --console-address :9001 #http://minio/data',
					env_file: ['./environment/minio.env'],
					networks: ['default', 'proxy'],
					depends_on: [],
					healthcheck: {
						test: [
							'CMD-SHELL',
							'[ "$$(curl \'http://localhost:9000\' -s -f -w %{http_code} -o /dev/null)" == "403" ] && echo OK || exit 1;',
						],
						interval: '5s',
						timeout: '10s',
						retries: 3,
						start_period: '3s',
					},
					volumes: args.isPersistant ? ['minio-data:/data'] : undefined,
					labels: {
						...traefikLabels('minio', { subDomain: 'files', port: 9000 }),
						...traefikLabels('minio_console', {
							subDomain: 'minio',
							port: 9000,
						}),

						// traefik: {
						//   http: {
						//     routers: {
						//       [`${config.prefix}_minio-http`]: {
						//         entrypoints: 'web',
						//         middlewares: 'https-redirect@file',
						//         rule: `Host(\`${config.hostName}\`)`,
						//         service: `${config.prefix}_minio`,
						//       }
						//     }
						//   }
						// }
					},
				})
			},

			get api() {
				return defineDockerComposeService('api', {
					image: `demo/api:${docker.api_version}`,

					env_file: ['.env'],
				})
			},
		},
	})
}

type TraefikLabelsOptions = {
	subDomain?: string
	port: number
}
function traefikLabels(serviceName: string, options: TraefikLabelsOptions) {
	const { hostName, prefix } = Config.getContextValue()

	const { subDomain, port } = options
	const fullHostName = [subDomain, hostName].filter(Boolean).join('.')
	const fullServiceName = `${prefix}_${serviceName}`

	return flattenObject({
		traefik: {
			enable: true,
			http: {
				services: {
					[fullServiceName]: { loadbalancer: { server: { port } } },
				},
				routers: {
					[`${fullServiceName}-http`]: {
						entrypoints: 'web',
						middlewares: 'https-redirect@file',
						rule: `Host(\`${fullHostName}\`)`,
						service: fullServiceName,
					},
					[`${fullServiceName}-https`]: {
						tls: true,
						entrypoints: 'websecure',
						rule: `Host(\`${fullHostName}\`)`,
						service: fullServiceName,
					},
				},
			},
		},
	})
}
