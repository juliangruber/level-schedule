require('rimraf').sync(__dirname + '/db');
var db = require('levelup')(__dirname + '/db');
var schedule = require('..')(db);

console.log('wait for 1s...');

schedule
  .job('simple', function () {
    console.log('executed');
  })
  .run('simple', Date.now() + 5000);
