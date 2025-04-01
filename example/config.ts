import { createContext } from 'tpl-dot-ts';
import { parseArgs } from 'node:util';

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

function select<T extends string, U>(target: T, conf: Partial<Record<T, U>> & { default: U }): U {
  return conf[target] ?? conf.default
}

export function createConfig(target: Target) {
  return {
    target,
    prefix: `nartex-${target}`,
    host: 'nartex.fr',
    hostName: 'nartex.fr',

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
        default: 'realty.test',
        development: 'realty.test',
        integ: 'realty.integ.nartest.fr',
        preproduction: 'preprod.realty.fr',
        production: 'realty.fr',
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
  }
}

export const configContext =
  createContext<ReturnType<typeof createConfig>>('config')
