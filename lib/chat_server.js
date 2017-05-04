var socketio = require('socket.io')
var io
var guestNumber = 1
var nickNames = {}
var namesUsed = []
var currentRoom = {}
exports.listen = function (server) {
  io = socketio.listen(server)
  io.set('log level', 1)
  io.sockets.on('connection', function (socket) {
    guestNumber = assignGuestNames(socket, guestNumber, nickNames, namesUsed)
    joinRoom(socket, 'Lobby')
    handleMessageBroadcasting(socket, nickNames)
    handleNameChangeAttempts(socket, nickNames, namesUsed)
    handleRoomJoining(socket)
    socket.on('rooms', function () {
      socket.emit('rooms', io.socket.manager.rooms)
    })
    handleClientDisconnection(socket, nickNames, namesUsed)
  })
}

function assignGuestNames (socket, guestNumber, nickNames, namesUsed) {
  var name = 'Guest' + guestNumber
  nickNames[socket.id] = name
  socket.emit('nameResult', {
    success: true,
    name: name
  })
  namesUsed.push(name)
  return guestNumber++
}

function joinRoom (socket, room) {
  /* Adds the client to the room, and
          fires optionally a callback with err
          signature (if any).
          signature -> socket.join(room[, callback])  */
  socket.join(room)
  currentRoom[socket.id] = room
  socket.emit('joinResult', {room: room})
  /* Broadcast to room1 except the sender. In other word,
            It broadcast all the socket clients which are connected
            to the room1 except the sender */
  socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + 'has joined ' + room + '.'
  })
  var usersInRoom = io.sockets.clients(room) // all users from room `room`
  if (usersInRoom.length > 0) {
    var usersInRoomsSummary = 'Users currently in ' + room + ' : '
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id
      if (userSocketId !== socket.id) {
        if (index > 0) {
          usersInRoomsSummary += ', '
        }
        usersInRoomsSummary += nickNames[userSocketId]
      }
    }
    usersInRoomsSummary += '.'
    socket.emit('message', {text: usersInRoomsSummary})
  }
}

function handleNameChangeAttempts (socket, nickNames, namesUsed) {
  socket.on('nameAttempt', function (name) {
    if (name.indexOf('Guest') === 0) {
      socket.emit('nameResult', {
        success: false,
        message: 'Name cannot begin with guest'
      })
    } else {
      if (namesUsed.indexOf(name) === -1) {
        var previousName = nickNames[socket.id]
        var previousNameIndex = namesUsed.indexOf(previousName)
        namesUsed.push(name)
        nickNames[socket.id] = name
        delete namesUsed[previousNameIndex]
        socket.emit('nameResult', {
          success: true,
          name: name
        })
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text: previousName + ' is now known as ' + name + '.'
        })
      } else {
        socket.emit('nameResult', {
          success: false,
          message: 'That name is already in use'
        })
      }
    }
  })
}

function handleMessageBroadcasting (socket) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ' : ' + message.text
    })
  })
}

function handleRoomJoining (socket) {
  socket.on('join', function (room) {
    /*  Removes the client from room,
                and fires optionally a
                callback with err signature (if any).
                signature socket.leave(room[, callback]) */
    socket.leave(currentRoom[socket.id])
    joinRoom(socket, room.newRoom)
  })
}

function handleClientDisconnection (socket) {
  socket.on('disconnect', function () {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id])
    delete namesUsed[nameIndex]
    delete nickNames[socket.id]
  })
}
