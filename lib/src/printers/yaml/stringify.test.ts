import { describe, expect, test } from 'vitest'
import YAML from 'yaml'
import { yamlStringify, meta } from './stringify'

describe('classic stringifier', () => {
	test('stringify', () => {
		const original = { foo: 'foo' }
		const stringified = yamlStringify(original)
		expect(stringified.trim()).toEqual(
			`
foo: foo
      `.trim(),
		)

		const parsed = YAML.parse(stringified)
		expect(parsed).toEqual(original)
	})
})

describe('stringifier comments as key', () => {
	test('disabled object', () => {
		const original = {
			foo: 'foo',
			...meta.disabled({ bar: 'bar', baz: 'baz', array: [1, 2, 3] }),
		}
		const stringified = yamlStringify(original)
		expect(stringified.trim()).toEqual(
			`
foo: foo
# bar: bar
# baz: baz
# array:
#   - 1
#   - 2
#   - 3
      `.trim(),
		)

		const parsed = YAML.parse(stringified)
		expect(parsed).toEqual(JSON.parse(JSON.stringify(original)))
	})
	test('disabled nested object', () => {
		const original = {
			foo: 'foo',
			nested: {
				key: 'value',
				...meta.disabled({ bar: 'bar' }),
			},
		}
		const stringified = yamlStringify(original)
		expect(stringified.trim()).toEqual(
			`
foo: foo
nested:
  key: value
  # bar: bar
      `.trim(),
		)

		const parsed = YAML.parse(stringified)
		expect(parsed).toEqual(JSON.parse(JSON.stringify(original)))
	})

	test('add comments', () => {
		const original = {
			foo: 'foo',
			nested: {
				key: 'value',
				...meta.comment('comment'),
				a: 'a',
			},
		}
		const stringified = yamlStringify(original)
		expect(stringified.trim()).toEqual(
			`
foo: foo
nested:
  key: value
  # comment
  a: a
      `.trim(),
		)

		const parsed = YAML.parse(stringified)
		expect(parsed).toEqual(JSON.parse(JSON.stringify(original)))
	})

	test('comment as value', () => {
		const original = {
			foo: 'foo',
			bar: meta.comment('Hello'),
			nested: {
				key: 'value',
				volumes: meta.disabled(['bar', 'baz'], 'Hello'),
			},
		}
		const stringified = yamlStringify(original)
		expect(stringified.trim()).toEqual(
			`
foo: foo
# Hello
nested:
  key: value
  # Hello
  # volumes:
  #   - bar
  #   - baz
      `.trim(),
		)

		const parsed = YAML.parse(stringified)
		expect(parsed).toEqual(JSON.parse(JSON.stringify(original)))
	})

	test('comment as value in array', () => {
		const original = {
			foo: 'foo',
			volumes: [
				meta.comment('this is a comment'),
				'bar:baz',
				meta.disabled('hello:world', 'enable in dev mode'),
				'baz:qux',
			],
		}
		const stringified = yamlStringify(original)
		expect(stringified.trim()).toEqual(
			`
foo: foo
volumes:
  # this is a comment
  - bar:baz
  # enable in dev mode
  # - hello:world
  - baz:qux
      `.trim(),
		)

		const parsed = YAML.parse(stringified)
		expect(parsed).toEqual(
			JSON.parse(
				JSON.stringify({
					...original,
					volumes: original.volumes.filter((x) => typeof x === 'string'), // TODO create a JSON replacer to handle this scenario
				}),
			),
		)
	})
})
