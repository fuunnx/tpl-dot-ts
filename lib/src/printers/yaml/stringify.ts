import YAML from 'yaml'
import { randomUUID } from 'node:crypto'
import { isPlainObject } from 'src/lib/predicates'

interface IMeta {
	disabled?: boolean
	original?: unknown
	commentBefore?: string
	commentInline?: string
}
class Meta implements IMeta {
	original?: unknown
	commentBefore?: string
	commentInline?: string

	constructor(props: IMeta) {
		Object.assign(this, props)
	}

	toJSON() {
		return undefined
	}
}

const hasMetaSymbol = Symbol('hasMeta')

class Comment {
	meta: Meta;
	[hasMetaSymbol] = true

	constructor(meta: IMeta) {
		const spreadableKey = `__meta_${randomUUID()}__` as const

		this.meta = new Meta(meta)

		Object.defineProperties(this, {
			[spreadableKey]: {
				value: this.meta,
				enumerable: true,
			},
			meta: {
				value: this.meta,
				enumerable: false,
			},
		})
	}

	toJSON() {
		return undefined
	}
}

export type Boxed<T> = T extends string
	? String
	: T extends number
		? Number
		: T extends boolean
			? Boolean
			: T

function boxed<T>(value: T): Boxed<T> {
	if (typeof value === 'string') return new String(value) as Boxed<T>
	if (typeof value === 'number') return new Number(value) as Boxed<T>
	if (typeof value === 'boolean') return new Boolean(value) as Boxed<T>
	return value as Boxed<T>
}

function unboxed<T>(value: Boxed<T>): T {
	if (value instanceof String) return value.valueOf() as T
	if (value instanceof Number) return value.valueOf() as T
	if (value instanceof Boolean) return value.valueOf() as T
	return value as T
}

const metaRegistry = new WeakMap<WeakKey, Meta>()
export const getMeta = (value: unknown): Meta | undefined => {
	if (isWeakKey(value)) return metaRegistry.get(value)
	return undefined
}

function withMeta<T>(value: T, meta: Meta): Boxed<T> {
	const boxedValue = boxed(value)
	metaRegistry.set(boxedValue as WeakKey, meta)
	return boxedValue
}

function isWeakKey(value: unknown): value is WeakKey {
	return (
		(typeof value === 'object' && value !== null) ||
		typeof value === 'function' ||
		typeof value === 'symbol'
	)
}

export const meta = {
	withCommentBefore<T>(value: T, commentBefore: string): Boxed<T> {
		return withMeta(value, new Meta({ commentBefore }))
	},
	withCommentInline<T>(value: T, commentInline: string): Boxed<T> {
		return withMeta(value, new Meta({ commentInline }))
	},
	comment(commentBefore: string) {
		return meta.disabled(undefined, commentBefore)
	},
	disabled(value: unknown, commentBefore?: string): Record<string, never> {
		return new Comment({
			original: value,
			commentBefore,
		}) as unknown as Record<string, never>
	},
}

export function yamlStringify(data: unknown): string {
	const placeHolderValues = new Map<string, string>()
	const createPlaceHolder = (value: string) => {
		const placeholderKey = `__PLACEHOLDER_${randomUUID()}__`
		placeHolderValues.set(placeholderKey, value)
		return placeholderKey
	}

	function stringifyMeta(
		key: string | undefined | number,
		metaValue: Meta,
		value?: unknown,
	) {
		const { commentBefore, commentInline, original } = metaValue

		const originalStringified = (() => {
			if (original === undefined) return ''
			if (key === undefined) {
				return yamlStringify(original).trim()
			}
			if (typeof key === 'number') {
				return yamlStringify([original]).trim()
			}
			if (typeof key === 'string') {
				return yamlStringify({ [key]: original }).trim()
			}
		})()

		const valueStringified = (() => {
			if (value === undefined) return ''
			if (key === undefined) {
				return yamlStringify(value).trim()
			}
			if (typeof key === 'number') {
				return yamlStringify([value]).trim()
			}
			if (typeof key === 'string') {
				return yamlStringify({ [key]: value }).trim()
			}
		})()

		const comments = prefixLines(
			[commentBefore, originalStringified].filter(Boolean).join('\n').trim(),
			'# ',
		)

		const valueWithInlineComment = [
			valueStringified,
			commentInline !== undefined && prefixLines(commentInline, '# '),
		]
			.filter(Boolean)
			.join(' ')

		return createPlaceHolder(
			[comments, valueWithInlineComment].filter(Boolean).join('\n'),
		)
	}

	const lines = YAML.stringify(
		data,
		function replacer(key, replacedValue) {
			const isComment = replacedValue instanceof Comment
			if (isComment) {
				const placeholderKey = stringifyMeta(key, replacedValue.meta)
				return placeholderKey
			}

			const attachedMeta = getMeta(replacedValue)
			if (attachedMeta) {
				return stringifyMeta(key, attachedMeta, unboxed(replacedValue))
			}

			if (!isPlainObject(replacedValue)) return replacedValue

			const hasToJson =
				'toJSON' in replacedValue && typeof replacedValue.toJSON === 'function'

			if (hasToJson) return (replacedValue.toJSON as () => unknown)()

			let result: Record<string | symbol, any> = {}

			const keys = Object.keys(replacedValue)
			for (const key of keys) {
				const value = replacedValue[key]

				if (Array.isArray(value)) {
					result[key] = value.map((x, index) => {
						return replacer(index, x)
					})
					continue
				}

				const isComment = value instanceof Comment
				if (isComment) {
					const placeholderKey = stringifyMeta(key, value.meta)
					result[placeholderKey] = null
					continue
				}

				const isMeta = value instanceof Meta
				if (!isMeta) {
					result[key] = value
					continue
				}

				const placeholderKey = stringifyMeta(undefined, value)
				result[placeholderKey] = null
			}

			return result
		},
		{},
	)

	return (lines ?? '') // if "data" is undefined, return an empty string instead of undefined
		.split('\n')
		.map((line) => {
			const match = line.match(/(\s*).*(__PLACEHOLDER_.*?__)/)
			if (!match) return line
			const [, indent, placeholderKey] = match
			const placeholderValue = placeHolderValues.get(placeholderKey!)!
			return prefixLines(placeholderValue, ' '.repeat(indent!.length))
		})
		.join('\n')
}

function prefixLines(lines: string, prefix: string) {
	if (lines === '') return ''
	return lines
		.split('\n')
		.map((line) => `${prefix}${line}`)
		.join('\n')
}
