import { Config } from '../config.ts'
import { TemplateDir, Tpl } from 'tpl-dot-ts'

export default function Default() {
	const config = Config.getContextValue()

	return Tpl.fromPath<TemplateDir>( './(ignoredFolder)', import.meta.dirname).withContext(
		new Config({
			...config,
			// @ts-expect-error overriden context for example
			target: config.target + '(overridden)',
		}),
	)
}
