var hiredis = require('hiredis');
var reader = new hiredis.Reader();
var slice = Array.prototype.slice;

function connect(addresses, opts) {
  opts = opts || {};

  var obj = Object.create({
    addjob: addjob, ackjob: ackjob, call: call,
    getjob: getjob, info: info, quit: quit
  });

  if (addresses.constructor === String) {
    addresses = addresses.split(',');
  }

  var sock = create(addresses[0]);

  var cycle = opts.cycle || 1000;
  var iteration, stats, nodes;
  var noop = function() {};
  var ops = [];

  function reset() {
    stats = {};
    nodes = {};
    iteration = 1;
    obj.prefix = undefined;
  }

  function create(addr) {
    reset();

    var parts = addr.split(':', 2)
      , sock = hiredis.createConnection(parts[1], parts[0]);

    if (typeof opts.maxListeners !== 'undefined') {
      sock.setMaxListeners(opts.maxListeners);
    }

    sock.on('reply', function(data) {
      if (data instanceof Error) {
        ops.shift()(data);
      }
      else {
        ops.shift()(null, data);
      }
    });

    sock.on('error', function(err) {
      ops.shift()(err);
    });

    return sock;
  }

  function write(args, fn) {
    ops.push(fn || noop);

    sock.write.apply(sock, args);
  }

  function call() {
    var args = slice.call(arguments);
    var cb = null;

    if (typeof args[args.length - 1] === 'function') {
      cb = args.pop();
    }

    if (obj.prefix) {
      write(args, cb);
    }
    else {
      inspect(function(err, res) {
        if (err) return cb(err);
        write(args, cb);
      });
    }
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
    var cb = args[args.length - 1] || noop;

    args[args.length - 1] = recorder(cb);

    call.apply(this, args);
  }

  function ackjob(ids, cb) {
    var args = ['ACKJOB'];

    if (!(ids instanceof Array)) ids = [ids];

    args.push.apply(args, ids)
    args.push(cb);

    call.apply(this, args);
  }

  function statsmax(stats) {
    var keys = Object.keys(stats);
    var maxi = -1;
    var maxv = null;

    for (var i = 0, l = keys.length; i < l; i++) {
      var v = stats[keys[i]];

      if (v > maxv || maxv == null) {
        maxv = v;
        maxi = i;
      }
    }

    return keys[maxi];
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

  function recorder(cb) {
    return function(err, jobs) {
      iteration++;

      if (err) return cb(err);

      for (var i = 0, l = jobs.length; i < l; i++) {
        var job = jobs[i]
          , prefix = job[1].slice(2, 10);

        // We can't know all prefixes beforehand
        // as new nodes can join the cluster after
        // we inspected it.
        stats[prefix] = (stats[prefix] || 0) + 1;
      }

      if (iteration === cycle) {
        var best = statsmax(stats);

        quit();

        sock = create(nodes[best]);
      }

      cb(err, jobs);
    }
  }

  function inspect(cb) {
    write(['HELLO'], function(err, res) {
      if (err) return cb(err);

      obj.prefix = res[1].slice(0, 8);

      for (var i = 2, l = res.length; i < l; i++) {
        var node = res[i];

        var p = node[0].slice(0, 8);

        nodes[p] = node[1] + ':' + node[2];
      }

      cb(null, res);
    });
  }

  return obj;
}

module.exports = {
  connect: connect
};
