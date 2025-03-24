import { docker } from './define/docker.ts'
import { defineDotenv } from './define/dotenv.ts'
import type { DirContent, WriteableDir } from './types.ts'
import type { Inflatable } from './types.ts'

export const define = {
	docker,
	dotenv: defineDotenv,
}
