var hiredis = require('hiredis');
var reader = new hiredis.Reader();
var slice = Array.prototype.slice;

function connect(addresses, options) {

  var addr = addresses[0].split(':', 2)
  var sock = hiredis.createConnection(addr[1], addr[0]);

  function write(args, fn) {
    fn = fn || function() {}

    sock.once('reply', function(data) {
      if (data instanceof Error) {
        fn(data);
      }
      else {
        fn(null, data);
      }
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

  function info(cb) {
    call('INFO', function(err, res) {
      if (err) return cb(err);

      cb(null, parseInfo(res));
    });
  }

  function parseInfo(str) {
    var result = {};

    str
      .split("\r\n")
      .forEach(function(line) {
        if (line.length === 0 || line[0] === '#') return;

        var parts = line.split(':', 2)
          , key = parts[0]
          , value = parts[1];

        result[key] = value;
      });

    return result;
  }

  function addjob(queue, job, timeout) {
    var args = buildargs(['ADDJOB', queue, job, timeout], [], arguments);

    call.apply(this, args);
  }

  function getjob(queues) {
    var args = buildargs(['GETJOB'], ['FROM'].concat(queues), arguments);

    call.apply(this, args);
  }

  function buildargs(prelude, postlude, args) {
    var arity = args.callee.length
      , result = slice.call(prelude)
      , cb;

    if (typeof args[arity] === 'object') {
      result.push.apply(result, options(args[arity]));
      cb = args[arity + 1];
    }
    else {
      cb = args[arity];
    }

    result.push.apply(result, postlude);
    result.push(cb);

    return result;
  }

  function options(obj) {
    var keys = Object.keys(obj);
    var result = Array(keys.length * 2);

    keys.forEach(function(key, i) {
      result[i*2] = key;
      result[i*2+1] = obj[key];
    });

    return result;
  }

  return Object.create({ call: call, quit: quit, info: info, addjob: addjob, getjob: getjob });
}

module.exports = {
  connect: connect
};
