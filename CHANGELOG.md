1.0.0 - 2016-07-15
==================

* Rewrite targeting Node LTS and current. Promises everywhere.

* New API: `new Disq({ nodes: [ ... ] })`. See README for more.

* Client can be reconfigured with a Promise-returning function.


0.1.3 - 2015-07-21
==================

* Upgraded Tape because older version would cause npm to go crazy.


0.1.2 - 2015-05-26
==================

* Added authentication support via the `auth` option.

* You can now pass the list of nodes as a comma-separated string. This is
  useful if you're reading this value from an environment variable.


0.1.1 - 2015-04-30
==================

* First usable release supporting automatic connection to the most convenient
  node in the cluster.
