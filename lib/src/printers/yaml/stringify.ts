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
	disabled?: boolean
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

	constructor(meta: Meta) {
		const spreadableKey = `__meta_${randomUUID()}__` as const

		this.meta = meta

		Object.defineProperties(this, {
			[spreadableKey]: {
				value: meta,
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

function disabled(value: unknown, commentBefore?: string) {
	return new Comment(
		new Meta({
			disabled: true,
			original: value,
			commentBefore,
		}),
	)
}

function comment(commentBefore: string) {
	return disabled(undefined, commentBefore)
}

export const meta = {
	comment,
	disabled,
}

export function yamlStringify(data: unknown): string {
	const placeHolderValues = new Map<string, string>()
	const createPlaceHolder = (value: string) => {
		const placeholderKey = `__PLACEHOLDER_${randomUUID()}__`
		placeHolderValues.set(placeholderKey, value)
		return placeholderKey
	}

	function stringifyMeta(key: string | undefined | number, metaValue: Meta) {
		const commentBefore = metaValue.commentBefore

		const originalStringified = (() => {
			if (metaValue.original === undefined) return ''
			if (key === undefined) {
				return yamlStringify(metaValue.original).trim()
			}
			if (typeof key === 'number') {
				return yamlStringify([metaValue.original]).trim()
			}
			if (typeof key === 'string') {
				return yamlStringify({ [key]: metaValue.original }).trim()
			}
		})()

		const stringValue = [commentBefore, originalStringified]
			.filter(Boolean)
			.join('\n')

		return createPlaceHolder(prefixLines(stringValue, '# '))
	}

	const lines = YAML.stringify(
		data,
		function replacer(key, currentValue) {
			const isComment = currentValue instanceof Comment
			if (isComment) {
				const placeholderKey = stringifyMeta(key, currentValue.meta)
				return placeholderKey
			}
			if (!isPlainObject(currentValue)) return currentValue

			// const hasMeta = currentValue[hasMetaSymbol]
			const hasToJson =
				'toJSON' in currentValue && typeof currentValue.toJSON === 'function'
			// const isCommentObject = currentValuecurrentValue instanceof Comment

			if (hasToJson) return (currentValue.toJSON as () => unknown)()
			// if (!hasMeta) return currentValue

			let result: Record<string | symbol, any> = {}

			const keys = Object.keys(currentValue)
			for (const key of keys) {
				const value = currentValue[key]
				if (typeof key !== 'string') {
					result[key] = value
					continue
				}

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
	return lines
		.split('\n')
		.map((line) => `${prefix}${line}`)
		.join('\n')
}
