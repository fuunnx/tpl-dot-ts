import { fail } from 'node:assert'
import { AsyncLocalStorage } from 'node:async_hooks'

export type ProvidedContext<T = unknown> = {
	'~storage': AsyncLocalStorage<T | EMPTY>
	value: T
}

export async function runWithContexts<R>(
	contexts: ProvidedContext[],
	fn: () => Promise<R>,
): Promise<R> {
	const reversed = [...contexts].reverse()
	for (const context of reversed) {
		const { '~storage': storage, value } = context
		const prevFunction = fn
		fn = () => {
			return storage.run(value, async () => await prevFunction())
		}
	}
	return fn()
}

const EMPTY = Symbol('empty')
type EMPTY = typeof EMPTY

export type ContextClass<T> = {
	new (value: T): ProvidedContext<T>
	getContextValue(): T
	getDefaultValue(): T
}

export function createContext<T>(
	name: string,
	getDefaultValue?: () => T,
): ContextClass<T> {
	const storage = new AsyncLocalStorage<T | EMPTY>()
	storage.enterWith(EMPTY)

	// Most non JS developers are more familiar with object oriented patterns, so I favor it in place of factory functions
	class Context implements ProvidedContext<T> {
		readonly '~storage' = storage

		readonly value: T
		constructor(value: T) {
			this.value = value
		}

		static getContextValue = () => {
			const value = storage.getStore()
			if (value === EMPTY) return this.getDefaultValue()
			else return value!
		}

		static getDefaultValue = (): T => {
			if (getDefaultValue) return getDefaultValue()
			return fail(`No default value for context: ${name}`)
		}
	}

	return Context
}
