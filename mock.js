const net     = require('net');
const hiredis = require('hiredis');


const reader = new hiredis.Reader();


function create(commands) {
  const server = net.createServer(function(socket) {

    socket.on('data', function(data) {
      reader.feed(data);

      const buffer  = reader.get();
      const command = buffer[0].toLowerCase();
      const args    = buffer.slice(1);

      if (!commands[command])
        throw new Error('Command not registered: ' + command);

      const res = reply(commands[command].apply(socket, args));

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
  if (obj.constructor === Array)
    return '*' + obj.length + '\r\n' + obj.map(reply).join('');
}


module.exports = create;
