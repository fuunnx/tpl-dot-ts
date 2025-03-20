export const tplFileExtensionRegex = /\.tpl\.[tj]s$/

export function isTplFile(fileName: string): boolean {
  return tplFileExtensionRegex.test(fileName)
}
