const {PassThrough} = require ('node:stream')

const F_IS_OPEN = Symbol ('is_open')

class Valve extends PassThrough {

	constructor (options) {

		super (options)

        this [F_IS_OPEN] = true

        this.on ('drain', () => this [F_IS_OPEN] = true)

	}

    get isOpen () {

        return this [F_IS_OPEN]

    }

    write (chunk, encoding, callback) {

        if (!this.isOpen) throw new Error ('Due to the overflow, the valve is closed')

        if (super.write (chunk, encoding, callback)) return true

        this [F_IS_OPEN] = false

        this.emit ('clog')

        return false

    }

}

module.exports = Valve