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

	readable [F_ORIGINAL_WRITE] = readable.write

	readable.write = overWrite

}

const F_SOURCE         = Symbol ('source')
const F_BRANCHES       = Symbol ('branches')

class Fitting extends Writable {

	static CLOG = F_CLOG

	constructor (options) {

		const superFinal = options.final ?? function (callback) {callback ()}

		options.final = function (callback) {

			for (const branch of this [F_BRANCHES]) branch.end ()

			superFinal (callback)

		}

		super (options)

		this [F_SOURCE] = null
		this [F_BRANCHES] = []

		this.on ('pipe', source => this [F_SOURCE] = source)

	}

	weld (branch) {

		const self = this

		branch [F_CLOG] = false

		branch.on ('drain', () => branch [F_CLOG] = false)

		wrap (branch)

		branch.on ('clog', () => self [F_SOURCE].pause ())

		branch.on ('drain', function () {

			branch [F_CLOG] = false

			for (const branch of self [F_BRANCHES]) if (branch [F_CLOG]) return

			self [F_SOURCE].resume ()

		})

		this [F_BRANCHES].push (branch)

		return this

	}

}

module.exports = Fitting