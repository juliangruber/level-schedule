require('rimraf').sync(__dirname + '/db');
var db = require('levelup')(__dirname + '/db');
var schedule = require('..')(db);

schedule
  .job('repeat', function (payload) {
    console.log('payload = ' + payload);
    this.run('repeat', payload + 1, Date.now() + 100);
  })
  .run('repeat', 0, Date.now());
