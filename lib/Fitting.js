const {Writable} = require ('node:stream')
const {CLOGGED, makeReportClogging} = require ('./Clog')

const F_BRANCHES = Symbol ('branches')

class Fitting extends Writable {

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

	get [CLOGGED] () {

		for (const branch of this [F_BRANCHES]) if (branch [CLOGGED]) return true

		return false
		
	}

	weld (branch) {	

		this [F_BRANCHES].push (

			makeReportClogging (branch)

				.on ('clog', () => this.emit ('clog'))

				.on ('drain', () => {

					branch [CLOGGED] = false

					if (!this [CLOGGED]) this.emit ('drain')

				}

			)

		)

		return this

	}

}

module.exports = Fitting