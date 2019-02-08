const express = require('express'),
    path = require('path'),
    socketIO = require('socket.io'),
    http = require('http'),
    users = require('./users')();

const publicPath = path.join(__dirname, '../public'),
    port = process.env.PORT || 3000,
    app = express(),
    server = http.createServer(app),
    io = socketIO(server);

const message = (name, text, id) => ({name, text, id});

app.use(express.static(publicPath));
io.on('connection', socket => {

    socket.on('join', (user, callback) => {
        if (!user.name || !user.room) {
            return callback('Enter valid user data')
        }

        callback({userId: socket.id});

        socket.join(user.room);
        users.remove(socket.id);
        users.add(socket.id, user.name, user.room);

        io.to(user.room).emit('users:update', users.getByroom(user.room));

        socket.emit('message:new', message('Admin', `Welcome, ${user.name}!`));
        socket.broadcast.to(user.room).emit('message:new', message('Admin', `${user.name} joined.`))
    });

    socket.on('message:create', (data, callback) => {
        if (!data) {
            callback(`Message can't be empty`)
        } else {
            const user = users.get(socket.id);
            if (user) {
                io.to(user.room).emit('message:new', message(data.name, data.text, data.id))
            }
            callback();
        }
    });

    socket.on('disconnect', () => {
        const user = users.remove(socket.id);
        if (user) {
            io.to(user.room).emit('message:new', message('Admin', `${user.name} left.`));
            io.to(user.room).emit('users:update', users.getByroom(user.room));

        }
    })
});

server.listen(port, () => {
    console.log(`server has been started.... on port ${port}`)
});