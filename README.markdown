# disque.js

Currently under development. You won't be able to use this even if you wanted to.

Inspired from [redic.js](https://github.com/cyx/redic.js) (which is inspired by [Redic](https://github.com/amakawa/redic)).

# Usage

```javascript
var disque = require('disque.js');
var client = disque.connect(['127.0.0.1:7710']);

client.call('PING', function(err, res) {
  if (err) console.error(err);

  console.log(res);

  client.quit();
});
```

# License

MIT.

Originally forked from Cyril David's [redic.js](https://github.com/cyx/redic.js).
