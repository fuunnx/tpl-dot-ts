import type { Compose } from 'compose-spec-schema'
import type { DefinitionsService } from 'compose-spec-schema/lib/type.js'
import { Config } from 'config.ts'

type NxCompose = Omit<Compose, 'services'> & {
	services?: Record<string, NxDefinitionsService | Record<string, never>>
}

export function defineDockerCompose<C extends NxCompose>(conf: C): C {
	return conf
}

type NxDefinitionsService = Omit<DefinitionsService, 'labels'> & {
	labels?: Record<string, any>
}

/**
 * Simple helper to define a service
 * Allow to opt out of the service if it's not needed
 */
export function defineDockerComposeService<
	Name extends string,
	S extends NxDefinitionsService,
>(
	name: Name,
	conf: S,
): S & { hostname: `${Config['value']['prefix']}-${Name}` } {
	const { prefix } = Config.getContextValue()

	return {
		hostname: `${prefix}-${name}`,
		...conf,
	}
}
