import {DeepCache} from './cache.ts';
import {randomUUID} from 'node:crypto';

const hashCache = new DeepCache()

export function associateId(values: unknown[]): string {
  if(!values.length) return 'EMPTY'
  return hashCache.upsert(values, () => {
    return randomUUID()
  })
}
