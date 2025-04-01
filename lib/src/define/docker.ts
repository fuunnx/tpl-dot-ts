import type { Compose } from 'compose-spec-schema'
import type { DefinitionsService } from 'compose-spec-schema/lib/type.js'

type Falsy = false | 0 | '' | null | undefined

function defineCompose<C extends Compose>(conf: C): C {
  return conf
}

type DockerParams = {
  prefix: string
  target: string
}
export function docker(params: DockerParams) {
  return {
    compose: defineCompose,
    service: createDefineService(params),
  }
}

type NxDefinitionsService = Omit<DefinitionsService, 'labels'> & {
  labels?: Record<string, any>
}

function createDefineService(params: DockerParams) {
  /**
   * Simple helper to define a service
   * Allow to opt out of the service if it's not needed
   */
  return function defineService<
    Name extends string,
    S extends NxDefinitionsService,
  >(name: Name, conf: S | Falsy): Record<string, never> | { [K in Name]: S } {
    type Return = { [K in Name]: S }

    if (!conf) {
      return {} as Return
    }

    const finalName = `${params.prefix}-${name}`
    // const labels = flattenObject(conf.labels || {})

    return {
      [finalName]: {
        ...conf
      },
    } as Return
  }
}
