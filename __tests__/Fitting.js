const {Readable, PassThrough} = require ('node:stream')
const {Fitting} = require ('../'), {CLOG} = Fitting

test ('no limits', async () => {

	const src = new PassThrough ({objectMode: true})

	const all = new PassThrough ({objectMode: true})
	const odd = new PassThrough ({objectMode: true})

	const hub = new Fitting ({objectMode: true,
		write (o, _, callback) {
			all.write (o)
			if (o.id % 2 === 1) odd.write (o)
			callback ()
		}
	})
	.weld (all)
	.weld (odd)

	src.pipe (hub)

	await new Promise (ok => {
		src.once ('pause', ok)
		src.write ({id: 1})
		src.write ({id: 2})
		src.end ({id: 3})
	})

	{

		const a = []; for await (const o of all) a.push (o)

		expect (a).toStrictEqual ([1, 2, 3].map (id => ({id})))
	
	}

	{

		const a = []; for await (const o of odd) a.push (o)

		expect (a).toStrictEqual ([1, 3].map (id => ({id})))
	
	}

})

test ('basic', async () => {

	const src = new PassThrough ({objectMode: true})

	const all = new PassThrough ({objectMode: true, highWaterMark: 1})
	const odd = new PassThrough ({objectMode: true, highWaterMark: 1})

	const hub = new Fitting ({objectMode: true,
		write (o, _, callback) {
			all.write (o)
			if (o.id % 2 === 1) odd.write (o)
			callback ()
		}
	})
	.weld (all)
	.weld (odd)

	src.pipe (hub)

	await new Promise (ok => {
		src.once ('pause', ok)
		src.write ({id: 1})
		src.write ({id: 2})
		src.end ({id: 3})
	})

	expect (src.isPaused ()).toBeTruthy ()
	expect (odd [CLOG]).toBeTruthy ()
	expect (all [CLOG]).toBeTruthy ()

	expect (() => all.write ({id: 2})).toThrow ('closed')

	expect (odd.read ()).toStrictEqual ({id: 1})
	expect (src.isPaused ()).toBeTruthy ()
	expect (odd [CLOG]).toBeFalsy ()
	expect (all [CLOG]).toBeTruthy ()

	expect (all.read ()).toStrictEqual ({id: 1})
	await new Promise (ok => src.once ('pause', ok))
	expect (all [CLOG]).toBeTruthy ()
	expect (odd [CLOG]).toBeFalsy ()
	expect (odd.read ()).toBeNull ()

	expect (all.read ()).toStrictEqual ({id: 2})
	await new Promise (ok => src.once ('pause', ok))
	expect (src.isPaused ()).toBeTruthy ()
	expect (odd [CLOG]).toBeTruthy ()
	expect (all [CLOG]).toBeTruthy ()

	expect (odd.read ()).toStrictEqual ({id: 3})
	expect (all.read ()).toStrictEqual ({id: 3})

})

test ('load', async () => {

	const N = 100000, N2 = 2 * N

	async function * generate () {

		for (let id = 1; id <= N2; id ++) yield {id}

	}	

	let n = 0, n2 = 0, win = false, finished = false

	const all = new PassThrough ({objectMode: true, highWaterMark: 1})
	const odd = new PassThrough ({objectMode: true, highWaterMark: 1})

	const hub = new Fitting ({objectMode: true,
		write (o, _, callback) {
			all.write (o)
			if (o.id % 2 === 1) odd.write (o)
			callback ()
		},
		final (callback) {
			win = true
			callback ()
		}
	})
	.weld (all)
	.weld (odd)
	.on ('finish', () => finished = true)

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
	expect (finished).toBe (true)
	expect (win).toBe (true)

})

test ('unpipe', () => {

	const src = new PassThrough (), dst = new Fitting ()

	src.pipe (dst)

	expect (dst.listenerCount ('clog')).toBe (1)
	expect (dst.listenerCount ('drain')).toBe (1)

	src.unpipe (dst)

	expect (dst.listenerCount ('clog')).toBe (0)
	expect (dst.listenerCount ('drain')).toBe (0)

})

