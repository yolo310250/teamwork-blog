var socket = io()
var session_id

let data = sessionStorage.getItem('sessionId')

if (data == null) {
    session_id = null
    socket.emit('getId', {
        sessionId: session_id
    })
} else {
    session_id = data
    socket.emit('getId', {
        sessionId: session_id
    })
}

socket.on("idConfirm", function(data) {
    sessionStorage.setItem('sessionId', data.sessionId)
})