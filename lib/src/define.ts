import { docker } from './define/docker.ts'
import { defineDotenv } from './define/dotenv.ts'
import { InflatableDir } from './inflate.ts'
import {
	type InflatableDirContent,
	type IInflatableDir,
	type IInflatableFile,
	familySym,
	Taxonomy,
	kindSym,
} from './types.ts'

export const define = {
	docker,
	dotenv: defineDotenv,
}

export function defineDir<T extends InflatableDirContent>(
	entries: T,
): InflatableDir<T> {
	return InflatableDir.fromEntries(entries)
}
export function defineFile(content: unknown): IInflatableFile {
	return {
		[familySym]: Taxonomy.FamilyEnum.inflatable,
		[kindSym]: Taxonomy.KindEnum.file,
		content() {
			return content
		},
	}
}
