const {Writable} = require ('node:stream')

const F_SOURCE     = Symbol ('source')
const F_BRANCHES   = Symbol ('branches')

class Fitting extends Writable {

	constructor (options) {

		super (options)

		this [F_SOURCE] = null
		this [F_BRANCHES] = []

		this.on ('pipe', source => this [F_SOURCE] = source)

		this.on ('close', () => {

			for (const branch of this [F_BRANCHES])

				branch.end ()

		})

	}

	addBranch (branch) {

		const self = this

		branch.on ('clog', () => self [F_SOURCE].pause ())

		branch.on ('drain', function () {

			for (const branch of self [F_BRANCHES])

				if (branch !== this && !branch.isOpen)

					return

			self [F_SOURCE].resume ()

		})

		this [F_BRANCHES].push (branch)

		return this

	}

}

module.exports = Fitting