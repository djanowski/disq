var net = require('net');
var hiredis = require("hiredis")
var reader = new hiredis.Reader();


function create(commands) {
  var server = net.createServer(function(socket) {

    socket.on('data', function(data) {
      reader.feed(data);

      var buffer = reader.get();
      var command = buffer[0].toLowerCase();
      var args = buffer.slice(1);

      if (!commands[command])
        throw new Error('Command not registered: ' + command);

      var res = reply(commands[command].apply(socket, args));

      try {
        socket.write(res);
      } catch (ex) { }
    });

  });

  return server;
}


function reply(obj) {
  if (obj.constructor === String)
    return '$' + obj.length + '\r\n' + obj + '\r\n';
}


module.exports = create;
