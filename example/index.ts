import { configContext, createConfig, type Target } from './config.ts'
import {
	Tpl,
	defineDir,
	type Inflatable,
} from 'tpl.ts'



const input = await Tpl.from('./input')

const dir = defineDir<Record<Target, Inflatable>>({
	development: input.withContext(
		configContext.provide(createConfig('development')),
	),
	integ: input.withContext(configContext.provide(createConfig('integ'))),
	preproduction: input.withContext(
		configContext.provide(createConfig('preproduction')),
	),
	production: input.withContext(
		configContext.provide(createConfig('production')),
	),
})

Promise.resolve().then(async () => {
	console.time('execution time')
	await dir.write('./output')
	console.timeEnd('execution time')
})
