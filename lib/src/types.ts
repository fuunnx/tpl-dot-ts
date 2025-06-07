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
	readonly [familySym]: Taxonomy.FamilyEnum
	readonly [kindSym]: Taxonomy.KindEnum
}

//

// writeable
export type Writeable = WriteableDir | WriteableFile | WriteableReference
export type WriteableDirContent = Record<string, Writeable>

export interface WriteableDir<
	T extends WriteableDirContent = WriteableDirContent,
> {
	readonly [familySym]: Taxonomy.FamilyEnum.writeable
	readonly [kindSym]: Taxonomy.KindEnum.dir
	content: T
}

export interface WriteableFile {
	readonly [familySym]: Taxonomy.FamilyEnum.writeable
	readonly [kindSym]: Taxonomy.KindEnum.file
	content: string // maybe implement stream interface too for better perf ?
}

export interface WriteableReference {
	readonly [familySym]: Taxonomy.FamilyEnum.writeable
	readonly [kindSym]: Taxonomy.KindEnum.reference
	path: string
}

// inflatable
export type Inflatable = IInflatableDir | IInflatableFile | IInflatableReference
export type InflatableDirContent = Record<string, Inflatable>

export interface IInflatableDir<
	T extends InflatableDirContent = InflatableDirContent,
> {
	readonly [familySym]: Taxonomy.FamilyEnum.inflatable
	readonly [kindSym]: Taxonomy.KindEnum.dir
	readonly contexts?: ProvidedContext[]

	content: () => T | Promise<T>
	withContext?: (...contexts: ProvidedContext[]) => IInflatableDir
}

export interface IInflatableFile {
	readonly [familySym]: Taxonomy.FamilyEnum.inflatable
	readonly [kindSym]: Taxonomy.KindEnum.file
	readonly contexts?: ProvidedContext[]

	content: () => unknown | Promise<unknown>
	withContext?: (...contexts: ProvidedContext[]) => IInflatableFile
}

export interface IInflatableReference {
	readonly [familySym]: Taxonomy.FamilyEnum.inflatable
	readonly [kindSym]: Taxonomy.KindEnum.reference
	readonly contexts?: ProvidedContext[]

	content: () => string | Promise<string>
	withContext?: (...contexts: ProvidedContext[]) => IInflatableReference
}

// utilities

export type Inflate<T extends Inflatable> = T extends IInflatableDir<
	infer DirContent extends InflatableDirContent
>
	? WriteableDir<InflateDirContent<DirContent>>
	: T extends IInflatableFile
		? WriteableFile
		: T extends IInflatableReference
			? WriteableReference
			: never

type InflateDirContent<T extends InflatableDirContent> = {
	[K in keyof T]: Inflate<T[K]>
}
