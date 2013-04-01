
# level-schedule

Durable job scheduler based on [LevelDB](https://github.com/rvagg/node-levelup).

[![Build Status](https://travis-ci.org/juliangruber/level-schedule.png?branch=master)](https://travis-ci.org/juliangruber/level-schedule)

## Usage

Print some JSON after 5s, even if the process restarts.

```js
var levelup = require('levelup');
var Schedule = require('level-schedule');

var db = levelup('./db');

Schedule(db)
  .job('print', function (payload) {
    console.log(payload);
  })
  .run('print', { some : 'json' }, Date.now() + 5000);

// => { some : 'json' }
```

## Periodic tasks

Run a task every 100ms. Always call `this.run` at the end of the task,
otherwise if the process crashes while running your task it will be
scheduled once too many.

```js
Schedule(db)
  .job('periodic', function () {
    console.log('doing some stuff...');
    this.run('periodic', Date.now() + 100)
  })
  .run('periodic', Date.now() + 100);
```

## Jobs

A job can be synchronous or asynchronous, just use the `done` argument when
defining an asynchronous job.

```js
Schedule(db)
  .job('sync', function (payload) {
    if (somethingBadHappend) {
      throw new Error();
    }
  })
  .job('async', function (payload, done) {
    // notice the 2nd argument
    doSomething(function (err) {
      done(err);
    });
  })
  .on('error', console.error)
  .run('sync')
  .run('async');
```

## API

### Schedule(db[, prefix])

Setup `level-schedule` to use `db`, storing tasks under `prefix`
(defaults to `schedule!`).

### Schedule#job(name, fn)

Register a job with `name` and `fn`.

`fn` is called with 2 arguments:

* `payload` : The payload
* `done` : If the job performs async operations, call `done()` when done. If
an error occured you can pass that as an error argument to `done`.

### Schedule#run(job[, payload], timestamp)

Run `job` with `payload` at `timestamp`.

### Schedule#on('error', fn)

Call `fn` whenever an `Error` occurs. When no error listener has been
registered, errors will be thrown.

## Installation

With [npm](http://npmjs.org) do

```bash
$ npm install level-schedule
```

## License

(MIT)
