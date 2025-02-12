const CLOG           = Symbol ('clog')
const ORIGINAL_WRITE = Symbol ('write')

function overWrite (chunk, encoding, callback) {

	if (this [ORIGINAL_WRITE] (chunk, encoding, callback)) return true

	this [CLOG] = true

	this.emit ('clog')

	return false

}

const makeReportClogging = (readable) => {

	readable [CLOG] = false

	readable [ORIGINAL_WRITE] = readable.write

	readable.write = overWrite

	return readable

}	

module.exports = {CLOG, makeReportClogging}