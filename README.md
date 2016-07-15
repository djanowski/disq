# Disq

A simple Disque client for Node.js.

Currently under development, but it's already usable and useful.


# Usage

```javascript
const Disq   = require('disq');
const disque = new Disq({ nodes: [ '127.0.0.1:7711', '127.0.0.1:7712' ] });

disque.addjob('queue1', 'foo')
  .then(function(jobID) {
    console.log(`Added job with ID ${jobID}`);
  });

// Meanwhile in a parallel universe
disque.getjob('queue1')
  .then(function(jobs) {
    jobs.forEach(function(job) {
      doVeryHeavyWork(job.body);

      disque.ackjob(job.id)
        .then(function() {
          console.log(`Processed job ${job.id}`);
        });
    });
  });
});
```

If you need to use authentication, pass in the `auth` option:

```javascript
const disque = new Disq({ auth: 'foobar' });
```


# Features

- **Automatic connection to the most convenient node in the cluster.**

  While consuming jobs with `disque.getjob`, the client will periodically
  check which node is producing the most jobs. In order to consume these more
  efficiently and to minimize message exchange in the cluster, the client will
  automatically reconnect to this node.

  The frequency of this check is configurable via the `cycle` option.

  Note that we limit this automatic reconnection to the initial node list you
  provide on connect.


# Roadmap

- Keep a stats counter by queue name?


# Name

After seeing that `disque` was squatted on npm, I named this library `disque.js`.
That was before I could tell how weird that name was in npm-land.
So on July 2016, together with a major rewrite, I renamed the library to `disq`.


# License

MIT.

Originally forked from Cyril David's [redic.js](https://github.com/cyx/redic.js).
