import { Tpl } from 'tpl.ts'

interface Writeable {
	content: () => unknown
}

function defineDir(entries: Record<string, Writeable | Dir>) {
	// return Tpl.fromObject(entries)
	return 'coucou'
}

export default defineDir({
	'./someFile.yaml': {
		content() {
			return {
				a: 1,
				b: 2,
			}
		},
	},
	'./somedir/someFile.js': {
		content() {
			return `
        export default { 
          a: 1,
          b: 2
        }
      `
		},
	},
	// edge case 1
	'../someParentFile.json': {
		content() {
			return {
				a: 1,
				b: 2,
			}
		},
	},
	// edge case 1
	// '.': {
	//   content() {
	//     return {
	//       a: 1,
	//       b: 2,
	//     }
	//   }
	// },
	'someOtherDir/nested': defineDir({
		'./someOtherFile.yaml': {
			content() {
				return {
					a: 1,
					b: 2,
				}
			},
		},
	}),
})
