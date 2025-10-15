import type { ProvidedContext } from './context.ts'
import { stateSym, kindSym, type StateSym, type KindSym } from './internal.ts'

export type { StateSym as FamilySym, KindSym }

export namespace Taxonomy {
	export enum StateEnum {
		materialized = 'materialized',
		template = 'template',
	}
	export enum KindEnum {
		dir = 'dir',
		file = 'file',
		reference = 'reference',
	}
}
type Taxonomy = {
	readonly [stateSym]: Taxonomy.StateEnum
	readonly [kindSym]: Taxonomy.KindEnum
}

//

// materialized
export type Materialized =
	| MaterializedDir
	| MaterializedFile
	| MaterializedReference
export type MaterializedDirContent = Record<string, Materialized>

export interface MaterializedDir<
	T extends MaterializedDirContent = MaterializedDirContent,
> {
	readonly [stateSym]: Taxonomy.StateEnum.materialized
	readonly [kindSym]: Taxonomy.KindEnum.dir
	content: T
}

export interface MaterializedFile {
	readonly [stateSym]: Taxonomy.StateEnum.materialized
	readonly [kindSym]: Taxonomy.KindEnum.file
	content: string // maybe implement stream interface too for better perf ?
}

export interface MaterializedReference {
	readonly [stateSym]: Taxonomy.StateEnum.materialized
	readonly [kindSym]: Taxonomy.KindEnum.reference
	path: string
}

// Template
export type Template = ITemplateDir | ITemplateFile | ITemplateReference
export type TemplateDirContent = Record<string, Template>

export interface ITemplateDir<
	T extends TemplateDirContent = TemplateDirContent,
> {
	readonly [stateSym]: Taxonomy.StateEnum.template
	readonly [kindSym]: Taxonomy.KindEnum.dir
	readonly contexts?: ProvidedContext[]

	content: () => T | Promise<T>
	withContext?: (...contexts: ProvidedContext[]) => ITemplateDir
}

export interface ITemplateFile<T = unknown> {
	readonly [stateSym]: Taxonomy.StateEnum.template
	readonly [kindSym]: Taxonomy.KindEnum.file
	readonly contexts?: ProvidedContext[]

	content: () => T | Promise<T>
	withContext?: (...contexts: ProvidedContext[]) => ITemplateFile<T>
}

export interface ITemplateReference {
	readonly [stateSym]: Taxonomy.StateEnum.template
	readonly [kindSym]: Taxonomy.KindEnum.reference
	readonly contexts?: ProvidedContext[]

	content: () => string | Promise<string>
	withContext?: (...contexts: ProvidedContext[]) => ITemplateReference
}

// utilities

export type Materialize<T extends Template> = T extends ITemplateDir<
	infer DirContent extends TemplateDirContent
>
	? MaterializedDir<MaterializeDirContent<DirContent>>
	: T extends ITemplateFile
		? MaterializedFile
		: T extends ITemplateReference
			? MaterializedReference
			: never

type MaterializeDirContent<T extends TemplateDirContent> = {
	[K in keyof T]: Materialize<T[K]>
}
