const {Readable, PassThrough} = require ('node:stream')
const {Fitting, Valve} = require ('../')

test ('basic', async () => {

	const src = new PassThrough ({objectMode: true})

	class Hub extends Fitting {

		constructor () {
			super ({objectMode: true})
			this.addBranch (this.all = new Valve ({objectMode: true, highWaterMark: 1}))
			this.addBranch (this.odd = new Valve ({objectMode: true, highWaterMark: 1}))
		}

		_write (o, _, callback) {
			this.all.write (o)
			if (o.id % 2 === 1) this.odd.write (o)
			callback ()
		}		

		_final (callback) {
			this.all.end ()
			this.odd.end ()
			callback ()
		}		

	}

	const hub = new Hub ()

	src.pipe (hub)

	await new Promise (ok => {
		src.once ('pause', ok)
		src.write ({id: 1})
		src.write ({id: 2})
		src.end ({id: 3})
	})

	expect (src.isPaused ()).toBe (true)
	expect (hub.odd.isOpen).toBe (false)
	expect (hub.all.isOpen).toBe (false)

	expect (hub.odd.read ()).toStrictEqual ({id: 1})
	expect (src.isPaused ()).toBe (true)
	expect (hub.odd.isOpen).toBe (true)
	expect (hub.all.isOpen).toBe (false)

	expect (hub.all.read ()).toStrictEqual ({id: 1})
	await new Promise (ok => src.once ('pause', ok))
	expect (hub.all.isOpen).toBe (false)
	expect (hub.odd.isOpen).toBe (true)
	expect (hub.odd.read ()).toBeNull ()

	expect (hub.all.read ()).toStrictEqual ({id: 2})
	await new Promise (ok => src.once ('pause', ok))
	expect (src.isPaused ()).toBe (true)
	expect (hub.odd.isOpen).toBe (false)
	expect (hub.all.isOpen).toBe (false)

	expect (hub.odd.read ()).toStrictEqual ({id: 3})
	expect (hub.all.read ()).toStrictEqual ({id: 3})

})

test ('load', async () => {

	const N = 100000, N2 = 2 * N

	async function * generate () {

		for (let id = 1; id <= N2; id ++) yield {id}

	}	

	let n = 0, n2 = 0

	const all = new Valve ({objectMode: true, highWaterMark: 1})
	const odd = new Valve ({objectMode: true, highWaterMark: 1})

	const hub = new Fitting ({objectMode: true,
		write (o, _, callback) {
			all.write (o)
			if (o.id % 2 === 1) odd.write (o)
			callback ()
		}
	})
	.addBranch (all)
	.addBranch (odd)
/*	
	.once ('close', _ => {
		all.end ()
		odd.end ()
	})
*/
	await new Promise (ok => {

		all.once ('end', ok)

		Readable.from (generate ()).pipe (hub)

		setTimeout (() => {
			
			odd.on ('data', _ => n ++)
		
			setTimeout (() => {
			
				all.on ('data', _ => n2 ++)
	
			}, 50)	

		}, 50)

	})

	expect (n).toBe (N)
	expect (n2).toBe (N2)

})