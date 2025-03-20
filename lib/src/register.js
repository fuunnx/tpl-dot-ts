import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transpile } from 'oxidase';

const contextualizedTplFileExtensionRegex = /\.tpl\.[tj]sx?\?context=([a-z0-9-]+)\.js$/

/** @type {import('node:module').LoadHook} */
export const load = async function load(url, context, nextLoad) {
  const isContextualizedTplFile = url.match(contextualizedTplFileExtensionRegex)
	if (!isContextualizedTplFile) return nextLoad(url, context);
  const contextId = isContextualizedTplFile[1]

  const urlWithoutContext = url.replace(`?context=${contextId}.js`, '')
	const rawSource = await fs.promises.readFile(fileURLToPath(urlWithoutContext), 'utf-8');
	const parsed = rewriteImports(transpile(rawSource), contextId);

	return {
		format: 'module',
		shortCircuit: true,
		source: parsed,
	};
}

function rewriteImports(source, contextId) {
  return source.replaceAll(/ from \'((.*)\.tpl\.[tj]sx?)\'/g, (_match, path) => {
    return ` from '${path}?context=${contextId}.js'`
  })
}
