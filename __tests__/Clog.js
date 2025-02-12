const {PassThrough} = require ('node:stream')
const {CLOGGED, monitorClogging} = require ('../')

test ('bad', () => {

	expect (() => monitorClogging ({})).toThrow ('itable')

})

test ('basic', () => {

	const s = new PassThrough ({objectMode: true, highWaterMark: 1})

	let cntC = 0
	let cntD = 0

	monitorClogging (s).on ('clog', () => cntC ++).on ('drain', () => cntD ++)

	expect (s [CLOGGED]).toBe (false)

	s.write ({id: 1})

	expect (s [CLOGGED]).toBe (true)

	expect (cntC).toBe (1)
	expect (cntD).toBe (0)

	expect (s.read ()).toStrictEqual ({id: 1})

	expect (s [CLOGGED]).toBe (false)
	expect (cntC).toBe (1)
	expect (cntD).toBe (1)

})