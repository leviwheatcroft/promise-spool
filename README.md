# promise-spool

![nodei.co](https://nodei.co/npm/promise-spool.png?downloads=true&downloadRank=true&stars=true) ![npm](https://img.shields.io/npm/v/promise-spool.svg) ![github-issues](https://img.shields.io/github/issues/leviwheatcroft/promise-spool.svg) ![stars](https://img.shields.io/github/stars/leviwheatcroft/promise-spool.svg) ![forks](https://img.shields.io/github/forks/leviwheatcroft/promise-spool.svg)

spool up promise based workers, feed them from a paginated api

Highlights:

## install

`npm i --save promise-spool`

## usage
```
let concurrency = 2
let highWaterMark = 2

// like streams, the null element at the end signifies that there's no more data
let results = [...underlyingResource].push(null)

function fetch (retrieved) {
  // retrieved will be the number of results previously retrieved by fetch
  // useful for pagination
  return vow.resolve(results.slice(retrieved, 5))
}
function worker (item, retry) {
  // item will be the next result from fetch
  // retry is a fn you can use to push an item back into the queue
  return doSomething(item)
  .catch((err) => {
    if (err.message === 'timeout') retry(item)
  }
}
promiseSpool({
  fetch, // fn returning promise which resolves to array of results
  worker, // fn returning promise which resolves when done
  concurrency, // number of concurrent workers (default: 2)
  highWaterMark // how many results to buffer from fetch (default: 2)
})
.then(() => console.log('done!'))

```

## Author

Levi Wheatcroft <levi@wht.cr>

## Contributing

Contributions welcome; Please submit all pull requests against the master
branch.

## License

 - **MIT** : http://opensource.org/licenses/MIT

[annotated source]: https://leviwheatcroft.github.io/promise-spool "fancy annotated source"
[github repo]: https://github.com/leviwheatcroft/promise-spool "github repo"
