type AnyFunc = (...args: any[]) => any

export class ValueCache<K, U> {
	#cache = new Map<K, U>()

	upsert<V extends U>(key: K, getValue: () => V): V {
		if (!this.#cache.has(key)) {
			this.#cache.set(key, getValue())
		}
		return this.#cache.get(key) as V
	}

	delete(key: K) {
		this.#cache.delete(key)
	}

	clear() {
		this.#cache.clear()
	}
}

export class WeakCache<K extends WeakKey, U> {
	#cache = new WeakMap<K, U>()

	upsert<V extends U>(key: K, getValue: () => V): V {
		if (!this.#cache.has(key)) {
			this.#cache.set(key, getValue())
		}
		return this.#cache.get(key) as V
	}

	delete(key: K) {
		this.#cache.delete(key)
	}

	clear() {
		this.#cache = new WeakMap()
	}
}

export class Cache<K, U> {
	#valueCache = new ValueCache<K, U>()
	#weakCache = new WeakCache<K & WeakKey, U>()

	upsert<V extends U>(key: K, getValue: () => V): V {
		if (isWeakKey(key)) {
			return this.#weakCache.upsert(key, getValue)
		} else {
			return this.#valueCache.upsert(key, getValue)
		}
	}

	delete(key: K) {
		if (isWeakKey(key)) {
			this.#weakCache.delete(key)
		} else {
			this.#valueCache.delete(key)
		}
	}

	clear() {
		this.#weakCache.clear()
		this.#valueCache.clear()
	}
}

export class DeepCache<Keys extends any[], U> {
	#cache = new ValueCache<number, Cache<any, any>>()

	upsert<V extends U>(keys: Keys, getValue: () => V): V {
		// prevent variable length cache keys to return wrong values
		let cache = this.#cache.upsert(keys.length, () => new Cache<any, any>())

		if (!keys.length) return getValue()
		for (let index = 0; index < keys.length; index++) {
			const key = keys[index]

			const isLast = index === keys.length - 1
			if (isLast) return cache.upsert(key, getValue)

			cache = cache.upsert(key, () => new Cache<any, any>())
		}

		return '' as never
	}

	clear() {
		this.#cache.clear()
	}
}

function isWeakKey(key: any): key is WeakKey {
	if (key === null) return false

	const type = typeof key

	if (type === 'symbol') {
		return Symbol.keyFor(key) === undefined
	}

	return type === 'object' || type === 'function'
}

export function memoize<Func extends AnyFunc>(func: Func): Func {
	const cache = new DeepCache()
	return function memoised(...args) {
		return cache.upsert(args, () => func(...args))
	} as Func
}
