import { describe, expect, test } from 'vitest'
import YAML from 'yaml'
import { meta, yamlStringify } from './stringify'

describe('classic stringifier', () => {
	test('stringify', () => {
		const original = { foo: 'foo' }
		const stringified = yamlStringify(original, {
      interpretHashAsComments: true
    })
		expect(stringified.trim()).toEqual(
			`
foo: foo
      `.trim(),
		)

		const parsed = YAML.parse(stringified)
		expect(parsed).toEqual(original)
	})
})

describe('stringifier comments as "# key"', () => {
	test('disabled object', () => {
		const original: { foo: string } = {
			foo: 'foo',
			...{
				'# Uncomment in dev': '#',
				'# bar': 'bar',
				'# baz': 'baz',
				'# array': [1, 2, 3],
			},
		}
		const stringified = yamlStringify(original, {
      interpretHashAsComments: true
    })
		expect(stringified.trim()).toEqual(
			`
foo: foo
# Uncomment in dev
# bar: bar
# baz: baz
# array:
#   - 1
#   - 2
#   - 3
      `.trim(),
		)

		const parsed = YAML.parse(stringified)
		const {
			'# Uncomment in dev': _1,
			'# bar': _2,
			'# baz': _3,
			'# array': _4,
			...expected
		} = original as any
		expect(parsed).toEqual(expected)
	})
	test('disabled nested object', () => {
		const original = {
			foo: 'foo',
			nested: {
				key: 'value',
				'# bar': 'bar',
			},
		}
		const stringified = yamlStringify(original, {
      interpretHashAsComments: true
    })
		expect(stringified.trim()).toEqual(
			`
foo: foo
nested:
  key: value
  # bar: bar
    `.trim(),
		)

		const parsed = YAML.parse(stringified)
		const { '# bar': _, ...expectedNested } = original.nested
		expect(parsed).toEqual({ ...original, nested: expectedNested })
	})

	test('add comments', () => {
		const original = {
			foo: 'foo',
			nested: {
				key: 'value',
				'# comment': '#',
				a: 'a',
			},
		}
		const stringified = yamlStringify(original, {
      interpretHashAsComments: true
    })
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
		const { '# comment': _, ...expectedNested } = original.nested
		expect(parsed).toEqual({ ...original, nested: expectedNested })
	})

	test('comment as value', () => {
		const original = {
			foo: 'foo',
			'# Hello': '#',
			nested: {
				key: 'value',
				'# Hello': '#',
				'# volumes': ['bar', 'baz'],
			},
		}
		const stringified = yamlStringify(original, {
      interpretHashAsComments: true
    })
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
		const { '# Hello': _1, nested, ...expected } = original
		const { '# Hello': _2, '# volumes': _3, ...expectedNested } = nested
		expect(parsed).toEqual({ ...expected, nested: expectedNested })
	})

	test('comment as value in array', () => {
		const original = {
			foo: 'foo',
			volumes: [
				'# this is a comment #',
				'bar:baz',
				'# enable in dev mode #',
				'# hello:world',
				'baz:qux',
			],
		}
		const stringified = yamlStringify(original, {
      interpretHashAsComments: true
    })
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
		expect(parsed).toEqual({
			...original,
			volumes: original.volumes.filter(
				(x) => typeof x === 'string' && !x.startsWith('#'),
			),
		})
	})
})

describe('stringifier "meta" comments', () => {
	test('disabled object', () => {
		const original: {foo: string} = {
			foo: 'foo',
      ...meta.disabled({ bar: 'bar', baz: 'baz', array: [1, 2, 3] }, 'Uncomment in dev'),
		}
		const stringified = yamlStringify(original, {
      interpretHashAsComments: true
    })
		expect(stringified.trim()).toEqual(
			`
foo: foo
# Uncomment in dev
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
		const stringified = yamlStringify(original, {
      interpretHashAsComments: true
    })
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
		const stringified = yamlStringify(original, {
      interpretHashAsComments: true
    })
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
		const stringified = yamlStringify(original, {
      interpretHashAsComments: true
    })
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
		const stringified = yamlStringify(original, {
      interpretHashAsComments: true
    })
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

	test('meta.withComment* on primitives', () => {
		const original = {
			foo: meta.withCommentInline(true, 'comment 1'),
			volumes: [
				meta.withCommentBefore('value', 'comment 2'),
				'bar:baz',
				meta.withCommentInline(1, 'comment 3'),
				'baz:qux',
			],
		}
		const stringified = yamlStringify(original, {
      interpretHashAsComments: true
    })
		expect(stringified.trim()).toEqual(
			`
foo: true # comment 1
volumes:
  # comment 2
  - value
  - bar:baz
  - 1 # comment 3
  - baz:qux
      `.trim(),
		)

		const parsed = YAML.parse(stringified)
		expect(parsed).toEqual(JSON.parse(JSON.stringify(original)))
	})
})

