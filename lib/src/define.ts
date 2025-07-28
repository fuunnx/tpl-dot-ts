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

export function defineFile<T extends unknown>(content: T | (() => T)): IInflatableFile {
	return {
		[familySym]: Taxonomy.FamilyEnum.inflatable,
		[kindSym]: Taxonomy.KindEnum.file,
		content() {
      if (typeof content === 'function') {
        // @ts-expect-error content may be a function expecting args
        return content()
      } else {
        return content
      }
		},
	}
}
