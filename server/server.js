import express from 'express';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import cors from 'cors';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ServerManager from './ServerManager.js';
import chalk from 'chalk';

const app = express();

app.use(cors({
    origin: '*'
}));

const server = createServer(app);
export const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

const PORT = process.env.PORT || 5000;

app.get('/check-login', (req, res) => {
    ServerManager.checkLogin(req, res)
})

app.get('/new-lobby', (req, res) => {
    ServerManager.createNewLobby(req, res)
})

server.listen(PORT, () => {
    console.log(chalk.dim(`server running at ${PORT}`));
})

io.on('connection', (socket) => {
    console.log(chalk.yellow(`🟡 ${socket.handshake.query.name} connecting...`))
    
    ServerManager.onConnectToLobby(socket)

    socket.on('disconnect', () => {
        console.log(chalk.yellow(`🟡 ${socket.handshake.query.name} disconnecting...`))
        ServerManager.onSocketClose(socket)
    })
    
    socket.on('message', (data) => {
        ServerManager.onMessage(socket, data)
    })
})