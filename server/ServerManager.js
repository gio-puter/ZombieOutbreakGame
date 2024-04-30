import chalk from "chalk"
import Lobby from "./Lobby.js"
import { io } from "./server.js"
import Game from "./game/Game.js"

class ServerManager {

    static userToLobby = new Map()
    static codeToLobby = new Map()

    static createNewLobby(req, res) {
        let lobbyCode = this.generateCode()
        while (this.codeToLobby.has(lobbyCode)) {
            lobbyCode = this.generateCode()
        }

        const lobby = new Lobby()
        this.codeToLobby.set(lobbyCode, lobby)

        console.log(chalk.green(`✅ New lobby create: ${lobbyCode}`))
        console.log(chalk.green(`🟢 Available lobbies: ${chalk.cyan(Array.from(this.codeToLobby.keys()).join(', '))}`))

        res.status(200).send(lobbyCode)
    }

    static checkLogin(req, res) {
        // console.log(req.query)
        const lobbyCode = req.query.lobby
        const name = req.query.name

        if (lobbyCode == null || name == null || name.replaceAll(' ', '') == "") {
            console.log(chalk.red(`❗️ Either lobby and name not specified.`))
            res.status(400).send("Lobby and name must be specificed.")
            return
        } else if (!this.codeToLobby.has(lobbyCode)) {
            console.log(chalk.red(`❗️ Lobby ${lobbyCode} not specified.`))
            res.status(404).send(`Lobby ${lobbyCode} was not found.`)
            return
        }

        const lobby = this.codeToLobby.get(lobbyCode)
        
        if (lobby.isFull()) {
            console.log(chalk.red(`❗️ Lobby ${lobbyCode} is currently full.`))
            res.status(489).send(`Lobby ${lobbyCode} is currently full.`)
            return
        } else if (lobby.isInGame()) {
            console.log(chalk.red(`❗️ Lobby ${lobbyCode} is currently in a game.`))
            res.status(488).send(`Lobby ${lobbyCode} is currently in a game.`)
            return
        } else if (lobby.hasUserWithName(name)) {
            console.log(chalk.red(`❗️ There is already a user with the name ${name} in the lobby ${lobbyCode}.`))
            res.status(403).send(`There is already a user with the name ${name} in the lobby ${lobbyCode}`)
            return
        } else {
            console.log(chalk.green(`✅ Login request valid.`))
            res.status(200).send("Login request valid.")
        }
    }

    static onConnectToLobby(socket) {
        const [username, lobbyCode] = [socket.handshake.query.name, socket.handshake.query.lobby]
        // console.log(username, lobbyCode)

        if (username == null || lobbyCode == null || username.replaceAll(' ', '') == '') {
            console.log(chalk.red(`❗️ Socket is missing name and/or lobby parameter.`))
            console.log('Websocket was missing name and/or lobby parameter.')
            socket.disconnect()
            return
        } 

        if (!this.codeToLobby.has(lobbyCode)) {
            console.log(chalk.red(`❗️ Lobby ${lobbyCode} does not exist.`))
            socket.disconnect()
            return
        }

        const lobby = this.codeToLobby.get(lobbyCode)
        if (lobby.hasUserWithName(username)) {
            console.log(chalk.red(`❗️ User with the same name is already in lobby ${lobbyCode}.`))
            socket.disconnect()
            return
        } else if (lobby.isFull()) {
            console.log(chalk.red(`❗️ Lobby ${lobbyCode} is currently full.`))
            socket.disconnect()
            return
        } else if (lobby.isInGame()) {
            console.log(chalk.red(`❗️ Lobby ${lobbyCode} is currently in a game.`))
            socket.disconnect()
            return
        }

        lobby.addUser(socket, username)
        this.userToLobby.set(socket, lobby)
        console.log(chalk.greenBright(`✅ ${username} connected and added to ${lobbyCode}`))
        lobby.updateAllUsers() // <-- Send information to all users in lobby
    }

    static onMessage(socket, data) {
        // console.log(data)
        const message = JSON.parse(data)
        console.log(message)

        if (message.lobby == null || message.name == null || message.command == null) {
            console.log(chalk.red("❌ Message request failed"))
            return
        }

        const username = message.name
        const lobbyCode = message.lobby

        if (!this.codeToLobby.has(lobbyCode)) {
            console.log(chalk.red(`❌ FAILED: Message from user ${username} in lobby ${lobbyCode} (${message})`))
            socket.disconnect()
            return
        }

        const lobby = this.codeToLobby.get(lobbyCode)

        try {
            switch (message.command) {
                case Commands.START_GAME:
                    lobby.startNewGame()
                    break;
                case Commands.GET_STATE:
                    lobby.updateUser(socket, username)
                    break;
                case Commands.NOMINATE_SUPPORT:
                    // verifyIsMayor(username, lobby)
                    lobby.Game().nominateStaff(message.primaryTarget, message.secondaryTarget) // <-- add targets' usernames
                    break;
                case Commands.REGISTER_VOTE:
                    {const vote = message.vote;
                    lobby.Game().registerVote(username, vote)}
                    break;
                case Commands.DOCTOR_CHOICE:
                    // verifyIsDoctor(username, lobby)
                    {const discard = message.choice;
                    lobby.Game().doctorDiscardPolicy(discard)}
                    break;
                case Commands.SHERIFF_CHOICE:
                    // verifyIsSheriff(username, lobby)
                    {const discard = message.choice;
                    lobby.Game().sheriffDiscardPolicy(discard)}
                    break;
                case Commands.MAYOR_CHOICE:
                    // verifyIsMayor(username, lobby)
                    {const enact = message.choice;
                    lobby.Game().mayorEnactPolicy(enact)}
                    break;
                case Commands.END_ROUND:
                    // verifyIsMayor(username, lobby)
                    lobby.Game().endMayoralTerm()
                    break;
                default:
                    break
            }
        } catch (e) {
            console.log(chalk.red(`❌ FAILED: Message from user ${username} in lobby ${lobbyCode} (${message})`))
            console.log(chalk.red(`${e.toString()}`))
        }
        lobby.updateAllUsers()
    }

    static onSocketClose(socket) {
        if (this.userToLobby.has(socket)) {
            let lobby = this.userToLobby.get(socket)
            if (lobby.hasUser(socket)) {
                lobby.removeUser(socket)
                lobby.updateAllUsers()
            }
            this.userToLobby.delete(socket)
        }
        console.log(chalk.red(`❌ ${socket.handshake.query.name} disconnected`))
    }

    static generateCode() {
        return Math.random().toString(36).slice(2).substring(0, 4).toUpperCase();
    }


}

export default ServerManager




const Commands = Object.freeze({
    START_GAME: "START_GAME",
    GET_STATE: "GET_STATE",
    NOMINATE_SUPPORT: "NOMINATE_SUPPORT",
    REGISTER_VOTE: "REGISTER_VOTE",

    DOCTOR_CHOICE: "DOCTOR_CHOICE",
    SHERIFF_CHOICE: "SHERIFF_CHOICE",
    MAYOR_CHOICE: "MAYOR_CHOICE",
    END_ROUND: "END_ROUND",

    MAYOR_POWER_SELECT: "MAYOR_POWER_SELECT",
    SUPPORT_EXAMINE: "SUPPORT_EXAMINE",
    SUPPORT_EXECUTE: "SUPPORT_EXECUTE",
    INFECT_SELECT: "INFECT_SELECT",

    REGISTER_DEAD_ACTION: "REGISTER_DEAD_ACTION",
    REGISTER_PEEK: "REGISTER_PEEK",
    REGISTER_GIVE_INTEL: "REGISTER_GIVE_INTEL",
    REGISTER_FORCE_EXAMINE: "REGISTER_FORCE_EXAMINE",
    REGISTER_FORCE_EXECUTE: "REGISTER_FORCE_EXECUTE",
    REGISTER_FORCE_ELECTION: "REGISTER_FORCE_ELECTION",
})