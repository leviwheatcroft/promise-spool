import promiseSpool from '../lib'
// import {
//   back as nockBack
// } from 'nock'
import vow from 'vow'
import assert from 'assert'
import debug from 'debug'
const dbg = debug('promise-spool')

// import debug from 'debug'
// const dbg = debug('metalsmith-google-drive')

// nockBack.setMode('record')
// nockBack.fixtures = 'test/fixtures/scrape'

describe('promise-spool test', () => {
  beforeEach(() => {
    // create spy
    // sinon.spy(cloudinary.api, 'resources')
  })
  afterEach(() => {
    // cloudinary.api.resources.restore()
  })
  // it('should be able to scrape a folder', (done) => {
  //   nockBack('scrape', (writeRequests) => {
  //     Metalsmith('test/fixtures/scrape')
  //     .use(classeur(Object.assign(
  //       {
  //         destPath: 'articles'
  //       },
  //       config.get('metalsmith-classeur')
  //     )))
  //     .use((files) => {
  //       assert.ok(files['articles/test-file'])
  //     })
  //     .build((err, files) => {
  //       if (err) return done(err)
  //       writeRequests()
  //       done()
  //     })
  //   })
  // }).timeout(0)
  it('should spool', (done) => {
    promiseSpool({
      fetch: (retrieved) => {
        if (retrieved > 50) return vow.resolve([null])
        return vow.resolve(
          [...new Array(10)].map(() => Math.round(Math.random()))
        )
      },
      worker: (item) => {
        return vow.timeout(item, 50)
      }
    })
    .then(() => {
      assert.ok(true)
      done()
    })
    .catch(dbg)
  })
  it('should resolve when results < concurrency', (done) => {
    promiseSpool({
      fetch: (retrieved) => vow.resolve([1, 2, 3, null]),
      worker: (item) => vow.resolve(item, 50),
      concurrency: 10
    })
    .then(done)
  }).timeout(500)
  it('should resolve when results > concurrency', (done) => {
    promiseSpool({
      fetch: (retrieved) => vow.resolve([1, 2, 3, null]),
      worker: (item) => vow.resolve(item, 50),
      concurrency: 2
    })
    .then(done)
  }).timeout(500)
  it('should resolve when result is async', (done) => {
    promiseSpool({
      fetch: (retrieved) => vow.delay([1, 2, 3, null], 200),
      worker: (item) => vow.resolve(item, 50),
      concurrency: 2
    })
    .then(done)
  }).timeout(500)
  it('worker error should be handled', (done) => {
    promiseSpool({
      fetch: (retrieved) => vow.resolve([1, 2, 3, null]),
      worker: (item) => { throw new Error('test error') },
      concurrency: 2
    })
    .then(done)
  })
  it('should not call fetch while pending', (done) => {
    let count = 0
    promiseSpool({
      fetch: (retrieved) => {
        count++
        return vow.delay([1, 2, 3, null], 500)
      },
      worker: (item) => {
        return vow.resolve(item, 50)
      },
      concurrency: 2
    })
    .then(() => {
      assert.equal(count, 1)
      done()
    })
    .catch(dbg)
  })
  it('worker resolve when no results are returned', (done) => {
    promiseSpool({
      fetch: (retrieved) => vow.resolve([null]),
      worker: (item) => vow.resolve(item),
      concurrency: 2
    })
    .then(done)
  })
})
