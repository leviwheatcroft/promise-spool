import vow from 'vow'
import debug from 'debug'
const dbg = debug('promise-spool')

export default function promiseSpool (options) {
  let promiseSpool = new PromiseSpool(options)
  promiseSpool.spool()
  return promiseSpool.done
}

class PromiseSpool {
  constructor (options) {
    // sane options & assign to instance
    if (!options.fetch) throw new Error('fetch fn required')
    if (typeof options.fetch !== 'function') throw new Error('fetch must be fn')
    if (!options.worker) throw new Error('worker fn required')
    if (typeof options.worker !== 'function') throw new Error('worker must be fn')
    if (!options.concurrency) options.concurrency = 2
    if (!options.highWaterMark) options.highWaterMark = 2
    Object.assign(this, options)
    // prime properties
    this.requested = vow.resolve()
    this.buffer = []
    this.waiting = []
    this.workers = 0
    this.count = 0
    // create promise to resolve when done
    this.doneDefer = vow.defer()
    this.done = this.doneDefer.promise()
  }
  more () {
    if (
      this.buffer.length > this.highWaterMark || // enough in the buffer
      this.exhausted || // fetch is exhausted
      !vow.isFulfilled(this.requested) // already fetching something
    ) return
    // create deferred to determine whether a request is in flight
    let defer = vow.defer()
    this.requested = defer.promise()
    // call provided fetch
    this.fetch(this.count)
    .then((items) => {
      this.count += items.length
      items.forEach(this.queue.bind(this))
      // check if we still need more
      process.nextTick(this.more.bind(this))
      defer.resolve()
    })
    .catch((err) => this.doneDefer.reject(err))
  }
  queue (item) {
    // null symbolises fetch is exhausted
    if (item === null) {
      this.exhausted = true
      this.resolveState()
    } else if (this.waiting.length) {
      // pass item to waiting worker
      this.waiting.shift().resolve(item)
    } else {
      // or buffer it
      this.buffer.push(item)
    }
  }
  next () {
    // if (this.exhausted && this.buffer.length === 0) {
    //   return vow.reject('end')
    // }

    // check if more items are needed
    this.more()

    if (this.buffer.length) {
      return vow.resolve(this.buffer.shift())
    } else {
      let waiting = vow.defer()
      this.waiting.push(waiting)
      return waiting.promise()
    }
  }
  spool () {
    while (this.workers < this.concurrency) this.spawn()
  }
  spawn () {
    this.workers++
    this.next()
    .then((item) => this.worker(item, this.queue.bind(this)))
    .catch((err) => {
      // allow unused workers to die quietly
      if (err === 'end') return
      // other errors shouldn't terminate the whole process
      // maybe add an option for this ?
      console.log(err)
    })
    .then(() => {
      this.workers--
      this.resolveState()
    })
  }
  resolveState () {
    // dbg('resolveState')
    // dbg('this.exhausted', this.exhausted)
    // dbg('this.buffer.length', this.buffer.length)
    // dbg('this.workers', this.workers)
    // dbg('this.waiting.length', this.waiting.length)

    // detect end state
    if (
      this.exhausted && // set by queue when `null` is queued
      this.buffer.length === 0 && // nothing waiting for free worker
      this.workers === this.waiting.length // no workers working
    ) {
      this.waiting.forEach((worker) => worker.reject('end'))
      this.doneDefer.resolve()
      return
    }
    // detect flowing state
    if (
      !this.exhausted || // set by queue when `null` is queued
      this.buffer.length !== 0 // something waiting
    ) {
      process.nextTick(this.spool.bind(this))
      return
    }

    // if neither of the above match, we're in a tail state, nothing more to do
    // but workers are still working
  }
}
