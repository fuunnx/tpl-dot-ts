import { InflatableDir } from './inflate/Dir.ts'
import {
	type InflatableDirContent,
	type IInflatableFile,
	familySym,
	Taxonomy,
	kindSym,
} from './types.ts'

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
