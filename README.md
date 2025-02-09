`stream-fitting` is a module for branching stream pipelines: connecting one source to many destinations, while keeping the memory footprint limited. It features two classes:

* [`Valve`](https://github.com/do-/node-stream-fitting/wiki/Valve) extending [`PassThrough`](https://nodejs.org/docs/latest/api/stream.html#class-streampassthrough) with an extra `'clog'` event and `isOpen` property;
* [`Fitting`](https://github.com/do-/node-stream-fitting/wiki/Fitting) extending [`Readable`](https://nodejs.org/docs/latest/api/stream.html#class-streamreadable) with `addBranch` method for registering `Valve`s as output destinations.

In the following example, a `Fitting` is built to sort mixed incoming data by two outgoing streams: one for classified messages, another for the rest.

```js
const mixedSource = /* some Readable */

const classifiedProxy = new Valve ({objectMode: true}).pipe (/* destination for classified messages */)
const generalProxy = new Valve ({objectMode: true}).pipe (/* destination for non-classified messages */)

const sorter = new Fitting ({objectMode: true,
  write (o, _, callback) {
    (o.isClassified ? classifiedProxy : generalProxy).write (o)
    callback ()
  }
})
.addBranch (classifiedProxy)
.addBranch (generalProxy)

mixedSource.pipe (sorter)
```

What `Fitting` + `Valve` do that standard `Writable` + `PassThrough` don't is controlling the [back pressure](https://nodejs.org/en/learn/modules/backpressuring-in-streams).

Each time `classifiedProxy.write` or `generalProxy.write` returns `false`, the `mixedSource` will be [`pause`](https://nodejs.org/docs/latest/api/stream.html#readablepause)d until both outgoing branches properly [`drain`](https://nodejs.org/docs/latest/api/stream.html#event-drain)ed. This works as for standard [.pipe ()](https://nodejs.org/docs/latest/api/stream.html#readablepipedestination-options), but with multiple destination streams accessible via arbitrary `write ()` calls.
