var test = require('tape');
var disque = require('./index');

function prepare(cb) {
  return function(t) {
    var client = disque.connect(['127.0.0.1:7711', '127.0.0.1:7712', '127.0.0.1:7713']);

    var end = t.end

    t.end = function(err) {
      client.quit();
      end.apply(t, err);
    };

    cb(t, client);
  }
}

test('ping', prepare(function(t, client) {
  client.call('PING', function(err, res) {
    t.assert(err == null);
    t.equal(res, 'PONG');
    t.end(err);
  });
}));
