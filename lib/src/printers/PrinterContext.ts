import { createContext } from '../context.ts'
import { fallbackPrinter, jsonPrinter, yamlPrinter } from './printers.ts'
import type { Printer } from './types.ts'

const defaultPrinters = [yamlPrinter(), jsonPrinter(), fallbackPrinter()]
export class PrinterContext extends createContext<Printer[]>(
	'printer',
	() => defaultPrinters,
) {
	static appendedBy(...printers: Printer[]) {
		return new this([...this.getContextValue(), ...printers])
	}

	static prependedBy(...printers: Printer[]) {
		return new this([...printers, ...this.getContextValue()])
	}
}
