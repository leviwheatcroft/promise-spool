import vow from 'vow'

export default function promiseSpool (options) {
  let promiseSpool = new PromiseSpool(options)
  promiseSpool.spool()
  return promiseSpool.done
}

class PromiseSpool {
  constructor (options) {
    if (!options.fetch) throw new Error('fetch fn required')
    if (typeof options.fetch !== 'function') throw new Error('fetch must be fn')
    if (!options.worker) throw new Error('worker fn required')
    if (typeof options.worker !== 'function') throw new Error('worker must be fn')
    if (!options.concurrency) options.concurrency = 2
    if (!options.highWaterMark) options.highWaterMark = 2
    Object.assign(this, options)
    this.requested = vow.resolve()
    this.buffer = []
    this.waiting = []
    this.workers = 0
    this.count = 0
    this.doneDefer = vow.defer()
    this.done = this.doneDefer.promise()
  }
  more () {
    if (
      (this.buffer.length > this.highWaterMark) ||
      (this.exhausted) ||
      (!vow.isFulfilled(this.requested))
    ) return
    let defer = vow.defer()
    this.requested = defer.promise()
    this.fetch(this.count)
    .then((items) => {
      this.count += items.length
      items.forEach(this.queue.bind(this))
      if (this.buffer.length < this.highWaterMark) {
        process.nextTick(this.more.bind(this))
      }
      defer.resolve()
    })
    .catch((err) => this.doneDefer.reject(err))
  }
  queue (item) {
    if (item === null) this.exhausted = true
    else if (this.waiting.length) this.waiting.shift().resolve(item)
    else this.buffer.push(item)
  }
  next () {
    this.more()
    if (this.exhausted && this.buffer.length === 0) {
      return vow.reject('end')
    } else if (this.buffer.length) {
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
    .then(() => {
      this.workers--
      if (this.exhausted & this.buffer.length === 0 && this.workers === 0) {
        this.doneDefer.resolve()
      } else {
        process.nextTick(this.spool.bind(this))
      }
    })
    .catch((err) => {
      this.workers--
      if (err !== 'end') throw err
    })
  }
}
