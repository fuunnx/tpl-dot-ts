import { randomUUID } from 'node:crypto'
import { DeepCache } from './cache.ts'

const hashCache = new DeepCache()

export function associateId(values: unknown[]): string {
	if (!values.length) return 'EMPTY'
	return hashCache.upsert(values, () => {
		return randomUUID()
	})
}
