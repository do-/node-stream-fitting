const {Valve} = require ('../')

test ('no limit', async () => {

	const ids = [1, 2]

	const valve = new Valve ({
		objectMode: true,
		highWaterMark: 10,
	})

	let clogs = 0; valve.on ('clog', () => clogs ++)

	for (const id of ids) expect (valve.write ({id})).toBe (true)

	expect (clogs).toBe (0)
	expect (valve.isOpen).toBe (true)

	valve.end ()

	const a = []; for await (const o of valve) a.push (o)

	expect (a).toStrictEqual (ids.map (id => ({id})))

})

test ('limit', async () => {

	const valve = new Valve ({
		objectMode: true,
		highWaterMark: 1,
	})

	let clogs = 0, drains = 0; valve.on ('clog', () => clogs ++).on ('drain', () => drains ++)

	expect (valve.isOpen).toBe (true)

	expect (valve.write ({id: 1})).toBe (false)

	expect (valve.isOpen).toBe (false)
	expect (clogs).toBe (1)
	expect (drains).toBe (0)

	expect (() => valve.write ({id: 2})).toThrow ('closed')

	expect (valve.isOpen).toBe (false)
	expect (clogs).toBe (1)
	expect (drains).toBe (0)

	expect (valve.read ()).toStrictEqual ({id: 1})

	expect (valve.isOpen).toBe (true)
	expect (clogs).toBe (1)
	expect (drains).toBe (1)

	expect (valve.read ()).toBeNull ()

})