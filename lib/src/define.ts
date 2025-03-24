import { docker } from './define/docker.ts'
import { defineDotenv } from './define/dotenv.ts'
import { writeDir } from './inflate.ts'
import type { DirContent, WriteableDir } from './types.ts'
import type { Inflatable } from './types.ts'

export const define = {
	docker,
	dotenv: defineDotenv,
}

export function defineDir<T extends DirContent>(
	entries: T,
): WriteableDir & Inflatable {
	return {
		'~kind': 'dir',
		content() {
			return entries
		},
		write(outputDir: string) {
			return writeDir(outputDir, this)
		},
	}
}
