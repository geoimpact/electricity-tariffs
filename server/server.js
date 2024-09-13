const express = require('express');
const http = require('http');
const { spawn } = require('child_process');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();

// Enable CORS for all routes and origins in Express
app.use(cors({
    origin: '*',  // Allow requests from any origin
    methods: ['GET', 'POST'],  // Allowed HTTP methods
    allowedHeaders: ['Content-Type']  // Allowed headers
}));

const server = http.createServer(app);

// Set up Socket.IO with CORS allowed for any origin
const io = socketIO(server, {
    cors: {
        origin: "*",  // Allow connections from any origin
        methods: ["GET", "POST"]  // Allowed HTTP methods for WebSocket connections
    }
});

// Serve the static files (HTML, JS)
app.use(express.static(path.join(__dirname, 'public')));

// When a client connects to the socket
io.on('connection', (socket) => {
    console.log('Client connected');

    // Listen for 'execute-command' event from the frontend
    socket.on('execute-command', (command) => {
        console.log(`Executing command: ${command}`);

        const parentDir = path.resolve(__dirname, '..');
        // Spawn a child process to execute the command
        const child = spawn(command, { cwd: parentDir, shell: true });

        // Stream the command output back to the client
        child.stdout.on('data', (data) => {
            socket.emit('command-output', data.toString());
        });

        child.stderr.on('data', (data) => {
            socket.emit('command-output', `ERROR: ${data.toString()}`);
        });

        child.on('close', (code) => {
            socket.emit('command-output', `Process exited with code ${code}`);
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
