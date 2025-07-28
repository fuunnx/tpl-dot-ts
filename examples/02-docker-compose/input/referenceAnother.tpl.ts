import { Config } from '../config.ts'
import { Tpl } from 'tpl-dot-ts'

export default async function Default() {
	const config = Config.getContextValue()

	return (await Tpl.from(import.meta, './(ignoredFolder)')).withContext(
		new Config({
			...config,
			// @ts-expect-error overriden context for example
			target: config.target + '(overridden)',
		}),
	)
}
