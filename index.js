var Sublevel     = require('level-sublevel');
var peek         = require('level-peek');
var stringify    = require('json-stringify-safe');
var EventEmitter = require('events').EventEmitter;
var inherits     = require('util').inherits;

module.exports = schedule;

/**
 * level-schedule.
 *
 * Task format:
 *   `<timestamp>!<random>` = { job : 'name' , payload : { pay : 'load' } }
 *
 * @param {levelUp} db
 * @param {String=} prefix
 * @return {schedule}
 */

function schedule (db, prefix) {
  if (!(this instanceof schedule)) return new schedule(db, prefix);
  
  EventEmitter.call(this);

  this.db = Sublevel(db).sublevel(prefix || 'schedule!');

  this.jobs = {};
  this.timeout = null;
}

inherits(schedule, EventEmitter);

/**
 * Run `job` with `payload` at `ts`.
 *
 * @param {String} job
 * @param {Object=} payload
 * @param {Number} ts
 * @return {schedule}
 */

schedule.prototype.run = function (job, payload, ts) {
  var self = this;

  if (!ts) {
    ts = payload;
    payload = null;
  }

  var error = self._error(job, payload);

  if (!self.jobs[job]) return error('job not found', job);

  var task = stringify({
    job     : job,
    ts      : ts,
    payload : payload
  })

  var key = ts + '!' + Math.random().toString(16).slice(2);

  self.db.put(key, task, function (err) {
    if (err) return error('saving job', err);
    if (!self.timeout || self.timeout.ts > ts) {
      self._start();
    }
  });

  return this;
}

/**
 * Register a job with `name` and `fn`.
 *
 * @param {String} name
 * @param {Function} fn
 * @return {schedule}
 */

schedule.prototype.job = function (name, fn) {
  this.jobs[name] = fn;
  return this;
}

/**
 * Run the first available task and repeat until all tasks are done.
 *
 * @api private
 */

schedule.prototype._start = function () {
  var self = this;

  peek.first(self.db, function (err, key, task) {
    // no tasks found
    if (err) return;

    // we inserted the task so we can trust it's valid json
    task = JSON.parse(task);

    var ts = key.split('!')[0];
    var job = self.jobs[task.job];
    var payload = task.payload;

    if (!job) {
      var err = new Error('job not found');
      err.task = task;
      return self.emit('error', err);
    }

    if (self.timeout) clearTimeout(self.timeout.id);

    self.timeout = { ts : ts };
    self.timeout.id = setTimeout(function () {

      // sync job
      if (job.length < 2) {
        try { job.call(self, payload); }
        catch (err) { onDone(err); }
        finally { onDone(); }
      // async job
      } else {
        job.call(self, payload, onDone);
      }

      function onDone (err) {
        if (err) {
          err._type = 'executing job';
          err._task = task;
          self.emit('error', err);
        }

        self.db.del(key, function (err) {
          self._start();
        });
      }

    }, ts - Date.now());
  });
}

/**
 * Return `error` helper function.
 *
 * @param {String} job
 * @param {Object} payload
 * @api private
 */

schedule.prototype._error = function (job, payload) {
  var self = this;

  return function (type, message) {
    var err = new Error(type);
    err._job = job;
    err._payload = payload;
    err._message = message;
    self.emit('error', err);
  };
}
