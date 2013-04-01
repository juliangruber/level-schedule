require('rimraf').sync(__dirname + '/db');
var db = require('levelup')(__dirname + '/db');
var schedule = require('..')(db);

var scheduled;

schedule
  .job('delay', function () {
    if (scheduled) console.log('delay', Date.now() - scheduled);
    scheduled = Date.now() + 100;
    this.run('delay', scheduled);
  })
  .run('delay', Date.now());
