import path from 'node:path'

import { register } from 'node:module'
import { InflatableDir } from './inflate/Dir.ts'
import { InflatableReference } from './inflate/Reference.ts'
import { normalizePath } from './lib/normalizePath.ts'
import { InflatableFile } from './inflate/File.ts'
import { fromPath } from './inflate/fromPath.ts'

export const Tpl = {
  async from(
    importMeta: { url: string },
    pathName: string,
  ): Promise<InflatableFile | InflatableReference | InflatableDir> {
    pathName = path.join(path.dirname(normalizePath(importMeta.url)), pathName)
    return fromPath(pathName)
  },
}

