// import proxy from './services/proxy.js'
// import {args} from '../.runtime/registerArgs.js';
// import { config } from '#runtime';

import { define, lib } from 'tpl-dot-ts'
import { args, configContext } from '../config.ts'


export default function Docker() {
  const config = configContext.use()
  const { docker, vars, prefix, target } = config

  const stack = define.docker({
    prefix,
    target,
  })

  return stack.compose({
    networks: {
      proxy: args.isLocal ? { driver: 'bridge' } : { external: true },
    },

    volumes: {
      'app-public': {},
      ...(args.isLocal
        ? {
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
        : {}),
    },

    services: {
      // ...autoImportServices('./services'),
      // ...proxy,
      // [`${config.prefix}-proxy`]: proxy,

      ...stack.service('db', {
        image: `registry.projects.nartex.fr/nartex/system/citus-postgis:${docker.citus_version}`,
        env_file: ['./environment/db.env'],
        user: vars.user || undefined,
        networks: ['default'],
        healthcheck: {
          test: ['CMD', 'pg_isready', '-U', 'postgres'],
          interval: '10s',
          timeout: '5s',
          retries: 5,
        },
        volumes: [
          lib.run(() => {
            const storagePath = args.isLocal
              ? './config'
              : '${STORAGE_DIRECTORY_PATH}/config'

            return `${storagePath}/citus/docker-entrypoint-initdb.d/multi-databases.sh:/docker-entrypoint-initdb.d/multi-databases.sh`
          }),

          ...lib.run(() => {
            if (!args.isPersistant) return []

            const storagePath = args.isLocal
              ? 'postgres-data'
              : '${STORAGE_DIRECTORY_PATH}/data/postgres-data'

            return [`${storagePath}:/var/lib/postgresql/data`]
          }),
        ],
      }),

      ...stack.service('typesense', {
        image: `typesense/typesense:${docker.typesense_version}`,
        env_file: ['./environment/typesense.env'],
        networks: ['default', 'proxy'],
        ports: args.isApiDev ? ['8108:8108'] : undefined,
        depends_on: [],
        volumes: args.isPersistant
          ? [
            args.isLocal
              ? 'typesense-data:/data'
              : '${STORAGE_DIRECTORY_PATH}/data/typesense-data:/data',
          ]
          : undefined,
      }),

      ...stack.service(
        'minio',
        args.isLocal && {
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
            ...traefikLabels('minio_console', { subDomain: 'minio', port: 9000 }),

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
        },
      ),

      api: {
        image: `realty/api:${docker.api_version}`,

        env_file: ['.env'],
      },
    },
  })
}

type TraefikLabelsOptions = {
  subDomain?: string
  port: number
}
function traefikLabels(serviceName: string, options: TraefikLabelsOptions) {
  const config = configContext.use()

  const { subDomain, port } = options
  const hostName = [subDomain, config.hostName].filter(Boolean).join('.')

  return {
    'traefik.enable': true,

    [`traefik.http.services.${config.prefix}_${serviceName}.loadbalancer.server.port`]:
      port,
    [`traefik.http.routers.${config.prefix}_${serviceName}-http.entrypoints`]:
      'web',
    [`traefik.http.routers.${config.prefix}_${serviceName}-http.middlewares`]:
      'https-redirect@file',
    [`traefik.http.routers.${config.prefix}_${serviceName}-http.rule`]: `Host(\`${hostName}\`)`,
    [`traefik.http.routers.${config.prefix}_${serviceName}-http.service`]: `${config.prefix}_${serviceName}`,

    [`traefik.http.routers.${config.prefix}_${serviceName}.tls`]: true,
    [`traefik.http.routers.${config.prefix}_${serviceName}.entrypoints`]:
      'websecure',
    [`traefik.http.routers.${config.prefix}_${serviceName}.rule`]: `Host(\`${hostName}\`)`,
    [`traefik.http.routers.${config.prefix}_${serviceName}.service`]: `${config.prefix}_${serviceName}`,
  }
}

// 'traefik.enable': true,

// [`traefik.http.services.${config.prefix}_minio.loadbalancer.server.port`]: 9000,
// [`traefik.http.routers.${config.prefix}_minio-http.entrypoints`]: 'web',
// [`traefik.http.routers.${config.prefix}_minio-http.middlewares`]: 'https-redirect@file',
// [`traefik.http.routers.${config.prefix}_minio-http.rule`]: 'Host(`files.${REALTY_HOSTNAME}`)',
// [`traefik.http.routers.${config.prefix}_minio-http.service`]: `${config.prefix}_minio`,

// [`traefik.http.routers.${config.prefix}_minio.tls`]: true,
// [`traefik.http.routers.${config.prefix}_minio.entrypoints`]: 'websecure',
// [`traefik.http.routers.${config.prefix}_minio.rule`]: 'Host(`files.${REALTY_HOSTNAME}`)',
// [`traefik.http.routers.${config.prefix}_minio.service`]: `${config.prefix}_minio`,

// [`traefik.http.services.${config.prefix}_minio_console.loadbalancer.server.port`]: 9001,
// [`traefik.http.routers.${config.prefix}_minio_console-http.entrypoints`]: 'web',
// [`traefik.http.routers.${config.prefix}_minio_console-http.middlewares`]: 'https-redirect@file',
// [`traefik.http.routers.${config.prefix}_minio_console-http.rule`]: 'Host(`minio.${REALTY_HOSTNAME}`)',
// [`traefik.http.routers.${config.prefix}_minio_console-http.service`]: `${config.prefix}_minio_console`,

// [`traefik.http.routers.${config.prefix}_minio_console.tls`]: true,
// [`traefik.http.routers.${config.prefix}_minio_console.entrypoints`]: 'websecure',
// [`traefik.http.routers.${config.prefix}_minio_console.rule`]: 'Host(`minio.${REALTY_HOSTNAME}`)',
// [`traefik.http.routers.${config.prefix}_minio_console.service`]: `${config.prefix}_minio_console`,
