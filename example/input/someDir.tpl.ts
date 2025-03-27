import { configContext } from '#tpl'
import { defineDir, defineFile } from 'tpl.ts'

const config = configContext.consume()

export default defineDir({
	'./someFile.yaml': defineFile({
		a: 1,
		b: 2,
		currentTarget: config.target,
	}),
	'./someFile.json': defineFile({
		a: 1,
		b: 2,
	}),
	// edge case 1
	// './somedir/someFile.js': defineFile(`
	//     export default {
	//       a: 1,
	//       b: 2
	//     }
	// `),
	// edge case 2
	// '../someParentFile.json': defineFile({
	// 	a: 1,
	// 	b: 2,
	// }),
	// edge case 3
	// '.': {
	//   content() {
	//     return {
	//       a: 1,
	//       b: 2,
	//     }
	//   }
	// },
	'someOtherDir/nested': defineDir({
		'./someOtherFile.yaml': defineFile({
			a: 1,
			b: 2,
		}),
	}),
})
