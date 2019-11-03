const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const uri = "mongodb+srv://user:123@fangrolf-ielcr.gcp.mongodb.net/test?retryWrites=true&w=majority";
const uuidv4 = require('uuid/v4')

var express = require('express')
var app = express()
var server = require('http').Server(app)
var sio = require('socket.io')(server)

app.use(express.static('../public'))

server.listen(8080, function () {
  console.log('Server running at port 8080.')
})

MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, client) {
  assert.equal(null, err)
  console.log("mongo connected.")

  const db = client.db("loginUsers")

  db.collection('users').drop()
  client.close()
})

sio.on('connection', function (socket) {
  console.log('Client connected.')

  socket.on('getId', function (data) {
    if (data.sessionId == null) {
      var session_id = uuidv4()
      socket.room = session_id
      socket.join(socket.room, function(res) {
        socket.emit("idConfirm", {
            sessionId: session_id
        })
      })
    } else {
      socket.room = data.sessionId
      socket.join(socket.room, function(res) {
        socket.emit("idConfirm", {
            sessionId: data.sessionId
        })
      })
    }
  })

  socket.on('login', function (data) {
    var uuid = data.sessionId
    var recAcnt = data.acnt
    var recPwd = data.pwd

    MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, client) {
      assert.equal(null, err)
      console.log("Checking account & password...")

      const db = client.db("password")

      var cursor = db.collection('users').find({}).project({_id: 0})

      cursor.each(function(err, doc) {
          if(doc) {
              var userAcnt = doc.account
              var userPwd = doc.password

              if (recAcnt == userAcnt) {
                if (recPwd == userPwd) {
                  console.log(userAcnt + " log in")
                  
                  MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, client) {
                    assert.equal(null, err)
                    console.log("adding logged user...")

                    const db = client.db("loginUsers")
                    db.collection('users').insertOne({
                      "account": userAcnt,
                      "uuid": uuid
                    })
                    client.close()
                  })

                  socket.emit('userPage', {
                    'account': userAcnt
                  })
                } else {
                  console.log(userAcnt + " incorrect pwd")
                  socket.emit('err')
                }
              }
          } else {
            console.log("finished query")
            socket.emit('err')
            client.close()
          }
      })
    })
  })

  socket.on('regist', function (data) {
    var recAcnt = data.acnt
    var recPwd = data.pwd

    MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, client) {
      assert.equal(null, err)
      console.log("adding new account...")

      const db = client.db("password")

      var cursor = db.collection('users').find({}).project({_id: 0})

      cursor.each(function(err, doc) {
          if(doc) {
            var userAcnt = doc.account

            if (recAcnt == userAcnt) {
              socket.emit('failed')
              client.close()
            }
          } else {
            db.collection('users').insertOne({
              "account": recAcnt,
              "password": recPwd
            })
            socket.emit('created')
            console.log("finished query")
            client.close()
           }
       })
    })
  })

  socket.on('disconnect', function () {
    console.log('Client disconnected.')
  })
})

app.get('*', function (req, res) {
  res.status(404).send('Page not found...')
})