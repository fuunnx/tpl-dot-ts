class Break<T> extends Error {
	readonly value: T

	constructor(value: T) {
		super()
		this.value = value
	}
}

class Continue<T> extends Error {
	readonly value: T

	constructor(value: T) {
		super()
		this.value = value
	}
}

function isBreak(error: unknown): error is Break<unknown> {
	return error instanceof Break
}
function isContinue(error: unknown): error is Continue<unknown> {
	return error instanceof Continue
}

export const controlFlow = {
	break<T>(value: T) {
		throw new Break(value)
	},
	continue<T>(value: T) {
		throw new Continue(value)
	},

	isBreak,
	isContinue,
}
