import { parseArgs, Tpl, overloadConfig, createContext } from "tpl.ts";

console.time('execution time')

export const args = parseArgs({
  input: './input',
  output: './output',
  target: ['development', 'integ', 'preproduction', 'production'] as const,
  isLocal: true,
  isPersistant: true,
  isApiDev: true
})

function resolveConfig(target: typeof args.target) {
  return {
    target,
    prefix: 'nartex',
    host: 'nartex.fr',
    hostName: 'nartex.fr',
  
    docker: overloadConfig(target, {
      front_version: {
        default: 'release/3-4',
        production: 'v3-4-0',
        preproduction: 'v3-4-0',
      },
      api_version: {
        default: 'release/3-4-debug',
        production: 'v3-4-0-release',
        preproduction: 'v3-4-0-release',
      },
      typesense_version: {
        default: '1-2-3',
      },
      citus_version: {
        default: 'internal-todo',
        production: 'todo',
        preproduction: 'todo',
      },
      minio_version: {
        'default': 'RELEASE.2022-08-26T19-53-15Z.fips',
      },
    }),
  
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
    })
  }
}


export const configContext = createContext<ReturnType<typeof resolveConfig>>('config')

const input = Tpl.from(args.input)
await Promise.all([
  input.withContext(configContext.provide(resolveConfig('development')))
    .write(`${args.output}/development`),
  input.withContext(configContext.provide(resolveConfig('integ')))
    .write(`${args.output}/integ`),
  input.withContext(configContext.provide(resolveConfig('preproduction')))
    .write(`${args.output}/preproduction`),
  input.withContext(configContext.provide(resolveConfig('production')))
    .write(`${args.output}/production`),
])

console.timeEnd('execution time')
