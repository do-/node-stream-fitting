const {Writable} = require ('node:stream')

const F_CLOG           = Symbol ('clog')
const F_ORIGINAL_WRITE = Symbol ('write')

function overWrite (chunk, encoding, callback) {

	if (this [F_CLOG]) throw new Error ('Due to the overflow, the valve is closed')

	if (this [F_ORIGINAL_WRITE] (chunk, encoding, callback)) return true

	this [F_CLOG] = true

	this.emit ('clog')

	return false

}

const wrap = readable => {

	readable [F_CLOG] = false

	readable [F_ORIGINAL_WRITE] = readable.write

	readable.write = overWrite

}

const F_BRANCHES       = Symbol ('branches')

class Fitting extends Writable {

	static CLOG = F_CLOG

	constructor (options = {}) {

		const superFinal = options.final ?? function (callback) {callback ()}

		options.final = function (callback) {

			for (const branch of this [F_BRANCHES]) branch.end ()

			superFinal (callback)

		}

		super (options)

		this.on ('pipe', source => {

			const 
				onClog  = () => source.pause (), 
				onDrain = () => source.resume ()

			this
				.on ('clog', onClog)
				.on ('drain', onDrain)
				.on ('unpipe', () => {
					this
						.off ('clog', onClog)
						.off ('drain', onDrain)
				})

		}) [F_BRANCHES] = []

	}

	get [F_CLOG] () {

		for (const branch of this [F_BRANCHES]) if (branch [F_CLOG]) return true

		return false
		
	}

	weld (branch) {

		const self = this

		wrap (branch)

		branch.on ('clog', () => self.emit ('clog'))

		branch.on ('drain', function () {

			branch [F_CLOG] = false

			if (!self [F_CLOG]) self.emit ('drain')

		})

		this [F_BRANCHES].push (branch)

		return this

	}

}

module.exports = Fitting