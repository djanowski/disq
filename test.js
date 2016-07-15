'use strict';

const test   = require('tape-promise')(require('tape'));
const Disq   = require('./index');
const mock   = require('./mock');

const NODES   = [ '127.0.0.1:7711', '127.0.0.1:7712', '127.0.0.1:7713' ];
const CYCLE   = 5;
const OPTIONS = { cycle: CYCLE };

const disque  = new Disq({ nodes: NODES });

test('ping', function(t) {
  return disque.call('ping')
    .then(function(reply) {
      t.equal(reply, 'PONG');
    });
});

test('info', function(t) {
  return disque.info()
    .then(function(reply) {
      t.equal(reply.loading, '0');
    });
});

test('unknown command', function(t) {
  return disque.call('foo')
    .then(t.fail)
    .catch(function(error) {
      t.assert(error, 'throws');
    });
});

test('addjob', function(t) {
  return disque.addjob('q1', 'j1')
    .then(function(reply) {
      t.assert(reply.startsWith('D-'));
    });
});

test('getjob', function(t) {
  return disque.addjob('q1', 'j1')
    .then(function() {
      return disque.getjob([ 'q1' ]);
    })
    .then(function(jobs) {
      t.equal(jobs.length, 1);
      t.equal(jobs[0].queue, 'q1');
      t.assert(jobs[0].id.startsWith('D-'));
      t.equal(jobs[0].body, 'j1');
    });
});

test('addjob with options', function(t) {
  let args;

  const disque = new Disq({ nodes: [ '127.0.0.1:7714' ] });

  const server = mock({
    addjob: function() {
      args = Array.prototype.slice.call(arguments);
      return 'D-123';
    }
  }).listen(7714);

  return disque.addjob('q1', 'j1', { timeout: 1000, ttl: 60, async: true })
    .then(function() {
      t.deepEqual(args, [ 'q1', 'j1', '1000', 'ttl', '60', 'async' ]);
    })
    .then(function() {
      disque.end();
      server.close();
    });
});

test('getjob with options', function(t) {
  let args;

  const disque = new Disq({ nodes: [ '127.0.0.1:7714' ] });

  const server = mock({
    getjob: function() {
      args = Array.prototype.slice.call(arguments);
      return [[ 'q1', 'D-123', 'j1' ]];
    }
  }).listen(7714);

  return disque.getjob('q1', { count: 1, nohang: true })
    .then(function() {
      t.deepEqual(args, [ 'count', '1', 'nohang', 'from', 'q1' ]);
    })
    .then(function() {
      disque.end();
      server.close();
    });
});

test.onFinish(function() {
  disque.end();
});
