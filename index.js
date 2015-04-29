var hiredis = require('hiredis');
var reader = new hiredis.Reader();
var slice = Array.prototype.slice;

function connect(addresses, options) {

  var addr = addresses[0].split(':', 2)
  var sock = hiredis.createConnection(addr[1], addr[0]);

  function write(args, fn) {
    fn = fn || function() {}

    sock.once('reply', function(data) {
      fn(null, data);
    });

    sock.once('error', function(err) {
      fn(err);
    });

    sock.write.apply(sock, args);
  }

  function call() {
    var args = slice.call(arguments);
    var cb = null;

    if (typeof args[args.length - 1] === 'function') {
      cb = args.pop();
    }

    write(args, cb);
  }

  function quit() {
    call('QUIT');
  }

  return Object.create({ call: call, quit: quit });
}

module.exports = {
  connect: connect
};
