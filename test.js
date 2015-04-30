var test = require('tape');
var disque = require('./index');

const NODES = ['127.0.0.1:7711', '127.0.0.1:7712', '127.0.0.1:7713'];

function prepare(cb) {
  return function(t) {
    var client = disque.connect(NODES);

    Promise.all(NODES.map(function(node) {
      return new Promise(function(resolve, reject) {
        var c = disque.connect([node]);

        c.call('DEBUG', 'FLUSHALL', function(err, res) {
          if (err) return reject(err);
          resolve(c);
        });
      });
    })).then(function(clients) {
      clients.forEach(function(c) {
        c.quit();
      });

      var end = t.end

      t.end = function(err) {
        client.quit();
        end.call(t, err);
      };

      try {
        cb(t, client);
      }
      catch (ex) {
        t.end(new Error(ex));
      }
    }).catch(function(err) {
      t.end(err);
    });
  }
}

test('ping', prepare(function(t, client) {
  client.call('PING', function(err, res) {
    t.assert(err == null);
    t.equal(res, 'PONG');
    t.end(err);
  });
}));

test('info', prepare(function(t, client) {
  client.info(function(err, res) {
    t.assert(err === null);
    t.equal(res.loading, '0');
    t.end(err);
  });
}));

test('addjob', prepare(function(t, client) {
  client.addjob('q1', 'j1', 0, function(err, res) {
    t.assert(err === null);
    t.assert(res.length > 0);

    client.info(function(err, info) {
      t.equal(info.registered_jobs, '1');
      t.end(err);
    });
  });
}));

test('getjob', prepare(function(t, client) {
  client.addjob('q3', 'j3', 0, function(err, res) {
    t.assert(err === null);

    client.getjob(['q3'], function(err, jobs) {
      t.assert(err === null);
      t.equal(jobs.length, 1);

      var job = jobs[0];

      t.equal(job[0], 'q3');
      t.assert(job[1].length > 0);
      t.equal(job[2], 'j3');
      t.end(err);
    });
  });
}));

test('getjob with options', prepare(function(t, client) {
  client.addjob('q4', 'j4', 0, function() {
    client.addjob('q4', 'j5', 0, function() {
      client.getjob(['q4'], {count: 1}, function(err, jobs) {
        t.assert(err === null);
        t.equal(jobs.length, 1);

        var job = jobs[0];

        t.equal(job[0], 'q4');
        t.assert(job[1].length > 0);
        t.equal(job[2], 'j4');
        t.end(err);
      });
    });
  });
}));
