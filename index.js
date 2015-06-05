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

  var cycle = opts.cycle || 1000;
  var iteration;
  var stats = new Map();
  var nodes = new Map();
  var noop = function() {};
  var ops = [];

  var sock = create(addresses[0]);

  function reset() {
    stats.clear();
    nodes.clear();
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
      var cb = ops.shift();

      if (cb)
        cb(err);
      else
        throw new Error(err);
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
      explore(function(err, res) {
        if (err) return cb(err);

        inspect(function(err, res) {
          if (err) return cb(err);
          write(args, cb);
        });
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
    var maxv = -1;
    var maxk;

    stats.forEach(function(v, k) {
      if (v > maxv) {
        maxk = k;
        maxv = v;
      }
    });

    return maxk;
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

        // Ignore nodes that we don't know about.
        if (stats.has(prefix))
          stats.set(prefix, stats.get(prefix) + 1);
      }

      if (iteration === cycle) {
        var best = statsmax(stats);

        quit();

        sock = create(nodes.get(best));
      }

      cb(err, jobs);
    }
  }

  function explore(cb) {
    Promise.all(addresses.map(identify))
      .then(function() {
        cb();
      })
      .catch(cb)
  }

  /* async */ function identify(addr) {
    return new Promise(function(resolve, reject) {
      var parts = addr.split(':', 2)
        , sock = hiredis.createConnection(parts[1], parts[0]);

      sock.once('reply', function(data) {
        sock.end();

        if (data instanceof Error)
          return reject(data);

        var p = data[1].slice(0, 8);

        nodes.set(p, addr);
        stats.set(p, 0);

        resolve();
      });

      sock.once('error', function(err) {
        sock.end();
        reject(err);
      });

      sock.write('HELLO');
    });
  }

  function inspect(cb) {
    auth(function(err, res) {
      if (err) return cb(err);

      write(['HELLO'], function(err, res) {
        if (err) return cb(err);

        obj.prefix = res[1].slice(0, 8);

        cb(null, res);
      });
    });
  }

  function auth(cb) {
    if (opts.auth)
      write(['AUTH', opts.auth], cb);
    else
      cb(null, null);
  }

  return obj;
}

module.exports = {
  connect: connect
};
