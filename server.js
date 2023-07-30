const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const PORT = process.env.PORT || 5000;
const openaiRoutes = require('./routes/openai');

// Create an HTTP server
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://127.0.0.1:5173", 
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: false
      }
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Pass the Socket.IO instance to the API routes
app.use('/api/openai', openaiRoutes(io));

server.listen(PORT, ()=>{
    console.log(`======SERVER is running @ ${PORT}`);
})
