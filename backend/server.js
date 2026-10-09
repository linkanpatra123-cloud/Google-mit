const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const MAX_PARTICIPANTS = 6;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = new Map();

app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));


const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) app.use(express.static(dist));

const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('join-room', ({ roomId, name, mic, cam } = {}) => {
    roomId = clean(roomId, 64).toLowerCase();
    name = clean(name, 40) || 'Guest';
    if (!roomId || currentRoom) return;

    const room = rooms.get(roomId) || new Map();
    if (room.size >= MAX_PARTICIPANTS) {
      socket.emit('room-full', { max: MAX_PARTICIPANTS });
      return;
    }

    rooms.set(roomId, room);
    currentRoom = roomId;
    socket.join(roomId);

    const existing = [...room.entries()].map(([id, u]) => ({ id, ...u }));
    const me = { name, mic: mic !== false, cam: cam !== false };
    room.set(socket.id, me);

    socket.emit('existing-users', existing);
    socket.to(roomId).emit('user-joined', { id: socket.id, ...me });
  });

  socket.on('signal', ({ to, data } = {}) => {
    if (!currentRoom || !to || !data) return;
    const room = rooms.get(currentRoom);
    if (!room || !room.has(to)) return;
    io.to(to).emit('signal', { from: socket.id, data });
  });

  socket.on('media-state', ({ mic, cam } = {}) => {
    const room = currentRoom && rooms.get(currentRoom);
    const user = room && room.get(socket.id);
    if (!user) return;
    user.mic = !!mic;
    user.cam = !!cam;
    socket.to(currentRoom).emit('media-state', { id: socket.id, mic: user.mic, cam: user.cam });
  });

  socket.on('chat', (text) => {
    const room = currentRoom && rooms.get(currentRoom);
    const user = room && room.get(socket.id);
    text = clean(text, 500);
    if (!user || !text) return;
    io.to(currentRoom).emit('chat', { id: socket.id, name: user.name, text, time: Date.now() });
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.delete(socket.id);
    socket.to(currentRoom).emit('user-left', { id: socket.id });
    if (room.size === 0) rooms.delete(currentRoom);
  });
});

server.listen(PORT, () => {
  console.log(`Meetly server running on http://localhost:${PORT}`);
});
