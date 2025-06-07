#!/usr/bin/env -S npx tsx

import { configContext, createConfig, type Target } from './config.ts'
import {
  Tpl,
  defineDir,
  type Inflatable,
} from 'tpl-dot-ts'

const input = await Tpl.from(import.meta, './input')

const dir = defineDir<Partial<Record<Target, Inflatable>>>({
  development: input.withContext(
    configContext.provide(createConfig('development')),
  ),
  integ: input.withContext(configContext.provide(createConfig('integ'))),
  // preproduction: input.withContext(
  // 	configContext.provide(createConfig('preproduction')),
  // ),
  // production: input.withContext(
  // 	configContext.provide(createConfig('production')),
  // ),
})

Promise.resolve().then(async () => {
  console.time('execution time')
  await dir.write('./output.gen')
  console.timeEnd('execution time')
})
