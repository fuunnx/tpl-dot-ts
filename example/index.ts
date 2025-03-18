import { parseArgs, inflateDir, overloadConfig } from "tpl.ts";

export const args = parseArgs({
  input: './input',
  output: './output',
  target: ['development', 'production', 'preproduction', 'dev', 'integ'] as const,
  isLocal: true,
  isPersistant: true,
  isApiDev: true
})

export const config = {
  prefix: 'nartex',
  host: 'nartex.fr',
  hostName: 'nartex.fr',

  docker: overloadConfig(args.target, {
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

  vars: overloadConfig(args.target, {
    host: {
      default: 'realty.test',
      dev: 'realty.test',
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



await inflateDir({
  input: args.input,
  output: `${args.output}/${args.target}` 
})
