import type { ProvidedContext } from './context.ts'

export const familySym = Symbol('family')
export type FamilySym = typeof familySym

export const kindSym = Symbol('kind')
export type KindSym = typeof kindSym

export namespace Taxonomy {
	export enum FamilyEnum {
		writeable = 'writeable',
		inflatable = 'inflatable',
	}
	export enum KindEnum {
		dir = 'dir',
		file = 'file',
		reference = 'reference',
	}
}
type Taxonomy = {
	[familySym]: Taxonomy.FamilyEnum
	[kindSym]: Taxonomy.KindEnum
}

// writeable
export type Writeable = WriteableDir | WriteableFile | WriteableReference

export interface WriteableDir {
	[familySym]: Taxonomy.FamilyEnum.writeable
	[kindSym]: Taxonomy.KindEnum.dir
	content: Record<string, Writeable>
}

export interface WriteableFile {
	[familySym]: Taxonomy.FamilyEnum.writeable
	[kindSym]: Taxonomy.KindEnum.dir
	content: string // maybe implement stream interface too for better perf ?
}

export interface WriteableReference {
	[familySym]: Taxonomy.FamilyEnum.writeable
	[kindSym]: Taxonomy.KindEnum.reference
	path: string
}

// inflatable
export type Inflatable = InflatableDir | InflatableFile | InflatableReference

export interface InflatableDir {
	[familySym]: Taxonomy.FamilyEnum.inflatable
	[kindSym]: Taxonomy.KindEnum.dir

	content: () =>
		| Record<string, Inflatable>
		| Promise<Record<string, Inflatable>>
	withContext?: (...contexts: ProvidedContext[]) => InflatableDir
}

export interface InflatableFile {
	[familySym]: Taxonomy.FamilyEnum.inflatable
	[kindSym]: Taxonomy.KindEnum.file

	content: () => unknown | Promise<unknown>
	withContext?: (...contexts: ProvidedContext[]) => InflatableFile
}

export interface InflatableReference {
	[familySym]: Taxonomy.FamilyEnum.inflatable
	[kindSym]: Taxonomy.KindEnum.reference

	content: () => string | Promise<string>
	withContext?: (...contexts: ProvidedContext[]) => InflatableFile
}
