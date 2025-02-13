![workflow](https://github.com/do-/node-stream-fitting/actions/workflows/main.yml/badge.svg)
![Jest coverage](./badges/coverage-jest%20coverage.svg)

`stream-fitting` is an [npm](https://www.npmjs.com/package/npm) module for building branched stream pipelines.

# Synopsis
In the following example, a `Fitting` is built to sort mixed incoming data by two outgoing streams: one for classified messages, another for the rest.

```js
const {Fitting} = require ('stream-fitting')

// Basic Usage ================================================

const mixedIn =       // ... a Readable source of messages

const classifiedOut = // ... some Writable for classified ones
const generalOut =    // ... another Writable for the rest

const sorter = new Fitting ({objectMode: true,
  write (o, _, callback) {
    (o.isClassified ? classifiedOut : generalOut).write (o)
    callback ()
  }
})
.weld (classifiedOut)  // observe for clog/drain, end on close
.weld (generalOut)     // this one too

mixedIn.pipe (sorter)

// Lower Level ===============================================

const {CLOG, makeReportClogging} = require ('stream-fitting')

const myWritable = // ...some Writable

makeReportClogging (myWritable)
  .on ('clog',  () => {/* custom pause */})
  .on ('drain', () => {/* custom resume */})

if (myWritable [CLOGGED]) {
  // wait until drained, or even abort processing
}
else {
  myWritable.write (moreData)
}

```

# Rationale

In some applications, an input data stream is mapped to several output ones, to be processed in parallel. Then you need a [`Transform`](https://nodejs.org/docs/latest/api/stream.html#class-streamtransform) like object with the ability to feed multiple output streams.

One approach here is to implement a [`Writable`](https://nodejs.org/docs/latest/api/stream.html#writable-streams) with a custom `_write ()` writing into two or more different `Writable`s, some of which may happen to be [`PassThrough`](https://nodejs.org/docs/latest/api/stream.html#class-streampassthrough) instances, for data receivers requiring [`Readable`](https://nodejs.org/docs/latest/api/stream.html#readable-streams) input.

But here comes the [back pressure](https://nodejs.org/en/learn/modules/backpressuring-in-streams) problem: to avoid memory leaks, you need to check the [`write ()`](https://nodejs.org/docs/latest/api/stream.html#writablewritechunk-encoding-callback) return value and stop the data processing until the [`'drain'`](https://nodejs.org/docs/latest/api/stream.html#event-drain) event lets you start it over. With standard [pipelines](https://nodejs.org/docs/latest/api/stream.html#streampipelinesource-transforms-destination-options), this is done automatically, but, alas, they are one dimensional, without any branching.

To cope with this issue, the `'stream-fitting'` module lets the developer:
* extend any existing `Writable` so it emits `'clog'` events in case when `write()` returns `false` (which complements standard `'drain'`);
* install all necessary handlers to invoke [`pause ()`](https://nodejs.org/docs/latest/api/stream.html#readablepause) / [`resume ()`](https://nodejs.org/docs/latest/api/stream.html#readableresume) automatically.

# API
tl;dr jump to the [`Fitting`](#Fitting) class description.

The text below is organized to describe internals progressively.

## `makeReportClogging`

This function takes a single [`Writable`](https://nodejs.org/docs/latest/api/stream.html#writable-streams) argument and returns it with the [`write ()`](https://nodejs.org/docs/latest/api/stream.html#writablewritechunk-encoding-callback) method overridden to emit the `'clog'` event and maintain the `[CLODDED]` property (see below)

```js
const {makeReportClogging} = require ('stream-fitting')
const myWritable = // ...some Writable
makeReportClogging (myWritable)
  .on ('clog',  /* custom pause  */)
  .on ('drain', /* custom resume */)
```
### `'clog'` event
This event precedes and mirrors the standard [`'drain'`](https://nodejs.org/docs/latest/api/stream.html#event-drain): it's emitted by the overridden (see above) [`write ()`](https://nodejs.org/docs/latest/api/stream.html#writablewritechunk-encoding-callback) just before returning `false`. 

Note that, in any case, the `callcack ()` is invoked prior to `return`, so `'clog'` is emitted after calling `callcack ()`.

### `[CLOGGED]` property
This property, initially `false`, is 
* set to `true` on `'clog'` and 
* reset back to `false` on `'drain'`.

```js
const {makeReportClogging, CLOGGED} = require ('stream-fitting')
const myWritable = // ...some Writable

makeReportClogging (myWritable)

if (myWritable [CLOGGED]) {
  // wait until drained, or even abort processing
}
else {
  myWritable.write (moreData)
}
```
No other event (`'error'`, `'close'`, `'finish'`, etc.)  is observed, so the `false` value here doesn't guarantee that `write ()` is OK to call.

The switching is done by event handlers, so using methods like [`removeAllListeners ()`](https://nodejs.org/docs/latest/api/events.html#emitterremovealllistenerseventname) may break the logic here.

## `Fitting`
This class extends the standard [`Writable`](https://nodejs.org/docs/latest/api/stream.html#writable-streams) and is presumed to be used in a similar manner, with `write` and `finish` using other `Writable`s previously registered as its _branches_ with the `weld ()` method.

If its instance is subject to [.pipe ()](https://nodejs.org/docs/latest/api/stream.html#readablepipedestination-options), the source stream is [`pause ()`](https://nodejs.org/docs/latest/api/stream.html#readablepause)d on each branch's `'clog'` and [`resume ()`](https://nodejs.org/docs/latest/api/stream.html#readableresume)d back when all of them are `'drain'`ed.

```js
const {Fitting} = require ('stream-fitting')
const mixedIn =       // ... a Readable source of messages

const classifiedOut = // ... some Writable for classified ones
const generalOut =    // ... another Writable for the rest

const sorter = new Fitting ({objectMode: true,
  write (o, _, callback) {
    (o.isClassified ? classifiedOut : generalOut).write (o)
    callback ()
  }
})
.weld (classifiedOut)  // observe for clog/drain, end on close
.weld (generalOut)     // this one too

mixedIn.pipe (sorter)
```
### `weld`
This method takes a single [`Writable`](https://nodejs.org/docs/latest/api/stream.html#writable-streams) argument, extends id with `makeReportClogging` (see above), adds to the internal collection of _branches_ and installs necessary event handlers.

### `[CLOGGED]` property
For a `Fitting`, this property is computed as the logical conjunction of all branches' `[CLOGGED]` values.
