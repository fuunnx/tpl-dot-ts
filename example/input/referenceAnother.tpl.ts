import { configContext } from "../config.ts";
import { Tpl } from "tpl-dot-ts";



export default async function Default() {
  const config = configContext.consume()

  return (await Tpl.from(
    import.meta,
    './(ignoredFolder)'
  )).withContext(
    configContext.provide({
      ...config,
      // @ts-expect-error overriden context for example
      target: config.target + '(overridden)'
    }),
  )
} 
