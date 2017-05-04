var http = require('http')
var fs = require('fs')
var path = require('path')
var mime = require('mime')
var cache = {}

function send404 (response) {
  response.writeHead(404, {'ContentType': 'text/plain'})
  response.write('Error 404 : resource not found ')
  response.end()
}

function sendFile (response, filePath, fileContents) {
  response.writeHead(200, {'content-type': mime.lookup(path.basename(filePath))})
  response.end(fileContents)
}

function serveStatic (response, cache, absPath) {
  if (cache[absPath]) {
    sendFile(response, absPath, cache[absPath])
  } else {
    fs.exists (absPath, function(exist) {
      console.log('exist', exist)
      if (exist) {
        fs.readFile(absPath, function(err, data) {
          if (err) {
            send404(response)
          } else {
            cache[absPath] = data
            console.log("data-->",data);
            sendFile (response, absPath, data)
          }
        })
      } else {
        send404(response)
      }
    })
  }
}

var server = http.createServer()
server.addListener('request', function (request, response) {
//event 'request' is registered and is called when server gets a request event via call to listen method on server object
  var filepath = false
  if (request.url === '/') {
    filepath = 'public/index.html'
  } else {
    filepath = 'public' + request.url
  }
  var absPath = './' + filepath
  serveStatic(response, cache, absPath)
})
  // Server is an instance of EventEmitter

//server.emit('request')
/*var server = http.createServer(function (request, response) {
  var filepath = false
  console.log('request.url-->', request.url)
  if (request.url === '/') {
    filepath = 'public/index.html'
  } else {
    filepath = 'public' + request.url
  }
  var absPath = '/' + filepath
  serveStatic(response, cache, absPath)
})*/

server.listen(3000, function () {
  console.log('Server running on port 3000')
})

var chatServer = require('./lib/chat_server') // takes the file -> compiles it and returns export which was declared in that file
chatServer.listen(server)
