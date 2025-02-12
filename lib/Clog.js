const {Writable} = require ('node:stream')

const CLOGGED        = Symbol ('clogged')
const ORIGINAL_WRITE = Symbol ('write')

function overWrite (chunk, encoding, callback) {

	if (this [ORIGINAL_WRITE] (chunk, encoding, callback)) return true

	this [CLOGGED] = true

	this.emit ('clog')

	return false

}

module.exports = {
	
	CLOGGED, 
	
	monitorClogging: writable => {

		if (!(writable instanceof Writable)) throw Error (`Not a Writable passed to monitorClogging: ` + writable)

		writable [CLOGGED] = false
	
		writable.on ('drain', () => writable [CLOGGED] = false)
	
		writable [ORIGINAL_WRITE] = writable.write
	
		writable.write = overWrite
	
		return writable
	
	}

}