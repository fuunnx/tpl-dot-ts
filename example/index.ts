#!/usr/bin/env -S npx tsx

import { Config } from './config.ts'
import { Tpl, defineDir } from 'tpl-dot-ts'

Promise.resolve().then(async () => {
	console.time('execution time')

	const input = await Tpl.from(import.meta, './input')

	await defineDir({
		development: input.withContext(Config.init('development')),
		integ: input.withContext(Config.init('integ')),
		preproduction: input.withContext(Config.init('preproduction')),
		production: input.withContext(Config.init('production')),
	}).write('./output.gen')

	console.timeEnd('execution time')
})
