import Player from "./game/datastructures/Player.js";
import Game from "./game/Game.js";
import GameToJSON from "./GameToJSON.js";
import { io } from "./server.js";

class Lobby {
    createdAt;
    game;

    socketToPlayer;
    activeSockets;
    players;

    constructor() {
        this.createdAt = new Date()
        this.socketToPlayer = new Map()
        this.activeSockets = new Set()
        this.players = new Set()
    }

    addUser(socket, username) {
        if (this.socketToPlayer.has(socket)) {
            throw new Error("Duplicate sockets cannot be added to a lobby.")
        }

        if (this.isInGame()) {
            // Code for checking if can add user during game (such as when user gets booted)
        } else if (this.isFull()) {
            throw new Error("Cannot add player because lobby is full.")
        } else if (this.hasUserWithName()) {
            throw new Error("Cannot add duplicate name.")
        } else {
            this.socketToPlayer.set(socket, username);
            if (!this.activeSockets.has(username)) {
                this.activeSockets.add(username)
            }
        }
    }

    removeUser(socket) {
        if (!this.hasUser(socket)) {
            throw new Error("Cannot remove websocket that is not in the lobby.")
        }

        const username = this.socketToPlayer.get(socket)

        
        // const index = this.activeSockets.indexOf(username)
        // this.activeSockets.splice(index, 1)
        this.activeSockets.delete(username)
        // this.socketToPlayer.delete(socket)
    }

    updateAllUsers() {
        for (let [key, value] of this.socketToPlayer) {
            this.updateUser(key, value)
        }

        if (this.game != null && this.game.hasGameFinished()) {
            this.game = null
        }
    }

    updateUser(socket, username) {
        let message;
        if (this.isInGame()) {
            // message = GameToJSON.convert(this.game, username)
            message = GameToJSON.convert(this.game, username)
            message.type = "game"
        } else {
            // console.log(this.activeSockets)
            // message = JSON.stringify({
            //     type: "lobby",
            //     usernames: Array.from(this.activeSockets)
            // })
            message = {
                type: "lobby",
                usernames: Array.from(this.activeSockets)
            }
            // console.log(message)
        }
        message = JSON.stringify(message)
        socket.emit("message", message)
    }

    startNewGame() {
        if (this.activeSockets.size > Game.MAX_PLAYERS) {
            throw new Error("Too many players to start a game.")
        } else if (this.activeSockets.size < Game.MIN_PLAYERS) {
            throw new Error("Not enough players to start a game.")
        } else if (this.isInGame()) {
            throw new Error("Cannot start a new game while a game is in progress.")
        }

        this.players.clear()
        this.activeSockets.forEach((elem) => this.players.add(elem))

        const playerNames = Array.from(this.activeSockets.values())
        playerNames.sort(() => Math.random() - 0.5)
        const players = []
        for (let playerName of playerNames) {
            players.push(new Player(playerName))
        }

        this.game = new Game(players)
    }


    isInGame() {
        return this.game != null
    }

    isFull() {
        this.activeSockets.size >= Game.MAX_PLAYERS
    }

    hasUser(socket) {
        return this.socketToPlayer.has(socket)
    }

    // hasUser(socket, username) {
    //     return this.socketToPlayer.has(socket) && this.socketToPlayer.get(socket) == username
    // }

    hasUserWithName(username) {
        for (const name of this.socketToPlayer.values()) {
            if (name == username) {
                return true
            }
        }
        return false
    }

    Game() {
        if (this.game == null) {
            throw new Error()
        } else {
            return this.game;
        }
    }

    // getPlayerCount() {

    // }

}


export default Lobby