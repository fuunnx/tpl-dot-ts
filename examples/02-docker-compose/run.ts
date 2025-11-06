#!/usr/bin/env -S npx tsx

import { Config } from './config.ts'
import { Tpl, defineDir } from 'tpl-dot-ts'

Promise.resolve().then(async () => {
	console.time('execution time')

	const input = await Tpl.fromPath('./input', import.meta.dirname)

	await defineDir({
		development: input.withContext(Config.init('development')),
		integ: input.withContext(Config.init('integ')),
		// preproduction: input.withContext(Config.init('preproduction')),
		// production: input.withContext(Config.init('production')),
	}).write('./output.gen', import.meta.dirname)

	console.timeEnd('execution time')
})
