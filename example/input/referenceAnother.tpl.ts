import { configContext } from "../config.ts";
import { Tpl } from "tpl.ts";
import path from "node:path";
import { fileURLToPath } from "node:url";

const config = configContext.consume()


export default (await Tpl.from(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)),'./(ignoredFolder)')
)).withContext(
  configContext.provide({
    ...config,
    // @ts-expect-error overriden context for example
    target: config.target + '(overridden)' 
  }),
)
