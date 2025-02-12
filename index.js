const {CLOGGED, monitorClogging} = require ('./lib/Clog')

module.exports = {
	CLOGGED,
	monitorClogging,
	Fitting: require ('./lib/Fitting'),
}