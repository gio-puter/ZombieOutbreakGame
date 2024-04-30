import Board from "./datastructures/Board.js"
import Deck from "./datastructures/Deck.js"
import Player from "./datastructures/Player.js"
import { Ability, AbilityOrder, GameState, Identity, Policy } from "./datastructures/enums.js"

class Game {
    
    static MIN_PLAYERS = 5
    static MAX_PLAYERS = 5;

    NUM_FORTIFICATION_POLICIES = 6
    NUM_OUTBREAK_POLICIES = 18
    NUM_MEDICAL_MILITARY_POLICIES = 10

    static MAX_FAILED_ELECTIONS = 3

    static MIN_DRAW_DECK_SIZE = 2
    static DRAW_SIZE = 2

    //                          0   1   2   3   4   5  6  7  8  9
    static NUM_INFECTED_FOR_PLAYERS = [-1, -1, -1, -1, -1, 1, 1, 2, 2, 2, 2, 2]

    clients = null
    players = []
    board = new Board()
    draw = new Deck()
    discard = new Deck()
    graveyard = new Deck()

    electionTracker = 0
    state = GameState.SETUP
    lastState = null
    round = 0

    lastMayor = null
    lastDoctor = null
    lastSheriff = null
    
    currMayor = null
    currDoctor = null
    currSheriff = null

    target = null
    legislativePolicies = null
    mayoralPolicies = null
    lastEnactedPolicy = null
    didElectionTrackerAdvance = false

    voteMap = new Map()
    abilityMap = new Map()
    deadAbilities = []
    deadAbilitiesOrder = []

    constructor(players) {
        this.players = players

        this.resetDeck();
        this.assignRoles();

        this.currMayor = this.players[0]
        this.state = GameState.MAYOR_STAFF_SELECTION
        this.round = 1
    }

    
    resetDeck() {
        this.draw = new Deck()
        this.discard = new Deck()
        this.graveyard = new Deck()

        const abilityKeys = Object.keys(Ability)

        for (let i = 0; i < this.NUM_FORTIFICATION_POLICIES; i++) {
            const randomKey = abilityKeys[Math.floor(Math.random() * abilityKeys.length)]
            const randomAbility = Ability[randomKey]
            this.draw.add([Policy.FORTIFICATION, randomAbility])
            // this.draw.add(Policy.FORTIFICATION)
        }
        for (let i = 0; i < this.NUM_MEDICAL_MILITARY_POLICIES; i++) {
            const randomKey = abilityKeys[Math.floor(Math.random() * abilityKeys.length)]
            const randomAbility = Ability[randomKey]
            this.draw.add([Policy.MEDICALMILITARY, randomAbility])
            // this.draw.add(Policy.MEDICALMILITARY)
        }
        for (let i = 0; i < this.NUM_OUTBREAK_POLICIES; i++) {
            const randomKey = abilityKeys[Math.floor(Math.random() * abilityKeys.length)]
            const randomAbility = Ability[randomKey]
            this.draw.add([Policy.OUTBREAK, randomAbility])
            // this.draw.add(Policy.OUTBREAK)
        }

        this.draw.shuffle()
    }

    assignRoles() {
        let numInfected = Game.NUM_INFECTED_FOR_PLAYERS[this.players.length]

        for (const player of this.players) {
            player.setIdentity(Identity.TOWN)
        }

        while (numInfected > 0) {
            const randomIndex = Math.floor(Math.random() * this.players.length)

            if (this.players[randomIndex].isInfected()) {continue}

            this.players[randomIndex].setIdentity(Identity.INFECTED)
            numInfected -= 1
        }
    }

    shuffleDiscardIntoDraw() {
        while (!this.discard.isEmpty()) {
            this.draw.add(this.discard.remove())
        }

        this.draw.shuffle()
    }

    shuffleGraveyardIntoDraw() {
        while (!this.graveyard.isEmpty()) {
            this.draw.add(this.graveyard.remove())
        }

        this.draw.shuffle()
    }

    nominateStaff(doctorUsername, sheriffUsername) {
        let numLivingPlayers = this.getLivingPlayerCount()

        if (this.getState() != GameState.MAYOR_STAFF_SELECTION) {
            throw new Error("Cannot nominate staff now (invalid state).")
        }
        else if (doctorUsername == sheriffUsername) {
            throw new Error("Cannot nominate same player for doctor and sheriff positions.")
        }

        this.nominateDoctor(doctorUsername)
        this.nominateSherrif(sheriffUsername)

        this.currDoctor = this.getPlayer(doctorUsername)
        this.currSheriff = this.getPlayer(sheriffUsername)

        this.lastState = this.state
        this.state = GameState.MAYOR_VOTING
        this.voteMap = new Map()
    }

    nominateDoctor(username) {
        let numLivingPlayers = this.getLivingPlayerCount()

        if (this.getState() != GameState.MAYOR_STAFF_SELECTION) {
            throw new Error("Cannot nominate a doctor now (invalid state).")
        }
        else if (!this.hasPlayer(username)) {
            throw new Error(`Player ${username} does not exist.`)
        }
        else if (!this.getPlayer(username).isAlive()) {
            throw new Error(`Player ${username} is dead and cannot be nominated for doctor position.`)
        }
        else if (this.currMayor.username == username) {
            throw new Error("Mayor cannot choose themselves to be doctor")
        }

        // this.currDoctor = this.getPlayer(username)
    }

    nominateSherrif(username) {
        let numLivingPlayers = this.getLivingPlayerCount()

        if (this.getState() != GameState.MAYOR_STAFF_SELECTION) {
            throw new Error("Cannot nominate a sheriff now (invalid state).")
        }
        else if (!this.hasPlayer(username)) {
            throw new Error(`Player ${username} does not exist.`)
        }
        else if (!this.getPlayer(username).isAlive()) {
            throw new Error(`Player ${username} is dead and cannot be nominated for sheriff position.`)
        }
        else if (this.currMayor.username == username) {
            throw new Error("Mayor cannot choose themselves to be sheriff")
        }

        // this.currSheriff = this.getPlayer(username)
    }

    registerVote(username, vote) {
        if (!this.hasPlayer(username)) {
            throw new Error(`Player ${username} is not in the game and cannot vote.`)
        } else if (this.hasPlayerVoted(username)) {
            throw new Error(`Player ${username} cannot vote twice.`)
        } else if (this.state != GameState.MAYOR_VOTING) {
            throw new Error(`Player ${username} cannot vote when a vote is not taking place.`)
        }
        
        this.voteMap.set(username, vote)

        let allPlayersHaveVoted = true
        let totalVotes = 0
        let totalYesVotes = 0

        for (const player of this.players) {
            if (!player.isAlive()) {continue}

            if (this.voteMap.has(player.username)) {
                totalVotes += 1
                if (this.voteMap.get(player.username)) {
                    totalYesVotes += 1
                }
            } else {
                allPlayersHaveVoted = false
            }
        }

        if (!allPlayersHaveVoted) {
            return
        }
        
        if (totalYesVotes / totalVotes > 0.5) { // MAYOR STAYS, CONTINUE TO LEGISLATION PHASE
            this.didElectionTrackerAdvance = false

            this.lastMayor = this.currMayor
            this.lastDoctor = this.currDoctor
            this.lastSheriff = this.currSheriff

            if (this.currMayor.isBad() && this.currDoctor.isBad() && this.currSheriff.isBad()) {
                this.lastState = this.state
                this.state = GameState.INFECTED_VICTORY_ELECTION
            }
            else {
                this.startLegislativeSession()
            }
        } else {
            this.advanceElectionTracker()
        }
    }

    advanceElectionTracker() {
        this.didElectionTrackerAdvance = true
        this.electionTracker += 1
        if (this.electionTracker == Game.MAX_FAILED_ELECTIONS) {
            if (this.draw.getSize() < Game.MIN_DRAW_DECK_SIZE) {this.shuffleDiscardIntoDraw()}

            const newPolicy = this.draw.remove()
            // const newPolicy = this.draw.remove()[0]
            this.board.enactPolicy(newPolicy)
            this.electionTracker = 0

            this.onEnactPolicy(newPolicy);
        } else {
            this.concludeMayoralTerm();
        }
    }

    onEnactPolicy(policy) {
        this.electionTracker = 0
        this.lastEnactedPolicy = policy

        // if (this.draw.getSize() < this.Game.MIN_DRAW_DECK_SIZE) {
        //     this.shuffleDiscardIntoDraw()
        // }
        if (this.didElectionTrackerAdvance) {
            this.state = GameState.POST_LEGISLATIVE

            this.lastMayor = null
            this.lastDoctor = null
            this.lastSheriff = null
            return
        }

        this.lastState = this.state
        switch (this.board.getActivatedPower()) {
            case "SPREAD":
                this.state = GameState.INFECT_SELECT
                break
            case "SUPPORT":
                this.state = GameState.MAYOR_POWER_SELECTION
                break
            case "NONE":
                if (this.anyDead() && this.getDeadPlayerCount() <= this.discard.getSize()) {
                    this.abilityMap = new Map()
                    this.startDeadActionSession()
                    // this.state = GameState.DEAD_ACTION
                } else {
                    this.state = GameState.POST_LEGISLATIVE
                }
                // this.state = GameState.POST_LEGISLATIVE
                break
        }
    }

    concludeMayoralTerm() {
        this.lastState = this.state
        this.state = GameState.POST_LEGISLATIVE
    }

    startLegislativeSession() {
        if (this.state != this.lastState && this.state != GameState.LEGISLATIVE_DOCTOR) {
            this.lastState = this.state
            this.state = GameState.LEGISLATIVE_DOCTOR
        }

        if (this.draw.getSize() < Game.MIN_DRAW_DECK_SIZE) {
            this.shuffleDiscardIntoDraw()
        }

        this.legislativePolicies = []
        this.mayoralPolicies = []
        for (let i = 0; i < Game.DRAW_SIZE; i++) {
            // this.legislativePolicies.unshift(this.draw.remove()[0])
            this.legislativePolicies.unshift(this.draw.remove())
        }
    }

    doctorDiscardPolicy(index) {
        if (this.state != GameState.LEGISLATIVE_DOCTOR) {
            throw new Error("Cannot discard a policy from the doctor's hand in this state.")
        } else if (index < 0 || index >= Game.DRAW_SIZE) {
            throw new Error(`Cannot discard policy at the index ${index}`)
        }
        
        this.discard.add(this.legislativePolicies.splice(index, 1)[0])
        this.mayoralPolicies = this.mayoralPolicies.concat(this.legislativePolicies)

        if (this.draw.getSize() < Game.MIN_DRAW_DECK_SIZE) {
            this.shuffleDiscardIntoDraw()
        }

        this.legislativePolicies = []
        for (let i = 0; i < Game.DRAW_SIZE; i++) {
            // this.legislativePolicies.unshift(this.draw.remove()[0])
            this.legislativePolicies.unshift(this.draw.remove())
        }
        
        this.lastState = this.state
        this.state = GameState.LEGISLATIVE_SHERRIF
    }

    sheriffDiscardPolicy(index) {
        if (this.state != GameState.LEGISLATIVE_SHERRIF) {
            throw new Error("Cannot discard a policy from the sheriff's hand in this state.")
        } else if (index < 0 || index >= Game.DRAW_SIZE) {
            throw new Error(`Cannot discard policy at the index ${index}`)
        }
        
        this.discard.add(this.legislativePolicies.splice(index, 1)[0])
        this.mayoralPolicies = this.mayoralPolicies.concat(this.legislativePolicies)

        this.lastState = this.state
        this.state = GameState.LEGISLATIVE_MAYOR
    }

    mayorEnactPolicy(index) {
        if (this.state != GameState.LEGISLATIVE_MAYOR) {
            throw new Error("Cannot enact policy from mayor's hand in this state.")
        } else if (index < 0 || index >= this.mayoralPolicies.length) {
            throw new Error(`Cannot discard policy at the index ${index}.`)
        }

        const newPolicy = this.mayoralPolicies.splice(index, 1)[0]
        this.board.enactPolicy(newPolicy)
        this.discard.add(this.mayoralPolicies.splice(0, 1)[0])
        this.onEnactPolicy(newPolicy)
    }

    mayorChoosePower(username) {
        if (this.state != GameState.MAYOR_POWER_SELECTION) {
            throw new Error("Cannot choose power in this state.")
        } else if (!this.hasPlayer(username)) {
            throw new Error(`Player ${username} does not exist.`)
        } else if (!this.getPlayer(username).isAlive()) {
            throw new Error(`Player ${username} is dead and cannot be chosen.`)
        }

        if (this.currDoctor.username == username) {
            this.lastState = this.state
            this.state = GameState.SUPPORT_POWER_EXAMINE
        } else if (this.currSheriff.username == username) {
            this.lastState = this.state
            this.state = GameState.SUPPORT_POWER_EXECUTE
        } else {
            throw new Error(`Player ${username} is not a doctor or sheriff.`)
        }
    }

    spreadInfection(username) {
        if (this.state != GameState.INFECT_SELECT) {
            throw new Error("Cannot infect someone in this state.")
        } else if (!this.hasPlayer(username)) {
            throw new Error(`Player ${username} does not exist.`)
        } else if (!this.getPlayer(username).isAlive()) {
            throw new Error(`Cannot infect a dead player (${username}).`)
        } else if (this.getPlayer(username).isInfected()) {
            throw new Error(`Cannot infect an infected player (${username}).`)
        }

        this.target = username
        this.getPlayer(username).infect()

        if (this.isInfectedSwarmVictory()) {
            this.lastState = this.state
            this.state = GameState.TOWN_VICTORY_EXTERMINATION
        } else {
            this.concludeMayoralTerm()
        }

        // put outbreak cards into graveyard
        for (let i = 0; i < this.board.getNumOutbreakPolicies(); i++) {
            this.graveyard.add(Policy.OUTBREAK)
        }
        this.board.resetOutbreakPolicies()
    }

    examinePlayer(username) {
        if (this.state != GameState.SUPPORT_POWER_EXAMINE) {
            throw new Error("Cannot examine player in this state.")
        } else if (!this.hasPlayer(username)) {
            throw new Error(`Player ${username} does not exist.`)
        } else if (this.currDoctor.username == username) {
            throw new Error("Doctor cannot examine themself.")
        }

        this.target = username
        const identity = this.getPlayer(username).getIdentity()
        this.concludeMayoralTerm()

        // put medical/military cards into graveyard
        for (let i = 0; i < this.board.getNumMedicalMilitaryPolicies(); i++) {
            this.graveyard.add(Policy.MEDICALMILITARY)
        }
        this.board.resetMedicalMilitaryPolicies()

        switch (identity) {
            case Identity.INFECTED:
                return Identity.INFECTED
            case Identity.ZOMBIE:
                return Identity.ZOMBIE
            default :
                return Identity.TOWN
        }
    }

    executePlayer(username) {
        if (this.state != GameState.SUPPORT_POWER_EXECUTE) {
            throw new Error("Cannot examine player in this state.")
        } else if (!this.hasPlayer(username)) {
            throw new Error(`Player ${username} does not exist.`)
        } else if (this.currSheriff.username == username) {
            throw new Error("Sheriff cannot execute themself.")
        } else if (!this.getPlayer(username).isAlive()) {
            throw new Error(`Cannot execute ${username} because they are dead.`)
        }

        this.target = username
        this.getPlayer(username).kill()

        // put medical/military cards into graveyard
        for (let i = 0; i < this.board.getNumMedicalMilitaryPolicies(); i++) {
            this.graveyard.add(Policy.MEDICALMILITARY)
        }
        this.board.resetMedicalMilitaryPolicies()

        if (this.isTownExterminationVictory()) {
            this.lastState = this.state
            this.state = GameState.TOWN_VICTORY_EXTERMINATION
        } else {
            this.concludeMayoralTerm()
        }
    }

    startDeadActionSession() {
        if (this.state != this.lastState && this.state != GameState.DEAD_ACTION) {
            this.lastState = this.state
            this.state = GameState.DEAD_ACTION
        }

        this.deadAbilities = []

        for(let i = 0; i < this.getDeadPlayerCount(); i++ ) {
            this.deadAbilities.unshift(this.discard.remove())
        }
    }

    registerDeadAction(username, ability) { 
        if (this.state != GameState.DEAD_ACTION) {
            throw new Error(`Player ${username} cannot take action in this state.`)
        } else if (!this.hasPlayer(username)) {
            throw new Error(`Player ${username} is not in the game and cannot vote.`)
        } else if (this.getPlayer(username).isAlive()) {
            throw new Error(`Player ${username} is not dead.`)
        } else if (this.hasDeadPlayerActed(username)) {
            throw new Error(`Player ${username} cannot take action twice.`)
        }
        
        this.abilityMap.set(username, ability)

        let allDeadHaveActed = true

        for (const player of this.players) {
            if (player.isAlive()) {continue}

            if (!this.abilityMap.has(player.username)) {
                allDeadHaveActed = false
                break
            }
        }

        if (!allDeadHaveActed) {return}

        this.deadAbilities = []

        let playerList = []
        for (const player of this.players) {
            if (!player.isAlive()) {playerList.push(player.username)}
        }

        this.deadAbilitiesOrder = this.sortPlayersByAbility(playerList, this.abilityMap)
        let tempDeadAbilitiesOrder = []

        for (item of this.deadAbilitiesOrder) {
            const playerName = item[0]
            const playerAbility = item[1]

            if (AbilityOrder[playerAbility] > 0) {
                tempDeadAbilitiesOrder.push(item)
                continue
            }

            switch (playerAbility) {
                case Policy.FORTIFICATION:
                    this.returnFortificationToDeck()
                    break;
                case Policy.MEDICALMILITARY:
                    this.returnMedicalMilitaryToDeck()
                    break;
                case Policy.OUTBREAK:
                    this.returnOutbreakToDeck()
                    break;
                case Ability.REMOVE_FORTIFICATION:
                    this.removeFortification();
                    break;
                case Ability.REMOVE_MEDICALMILITARY:
                    this.removeMedicalMilitary();
                    break;
                case Ability.REMOVE_OUTBREAK:
                    this.removeOutbreak();
                    break;
            }
        }

        this.deadAbilitiesOrder = tempDeadAbilitiesOrder.slice()
        
        // SET STATE BASED ON DEAD ABILITY
        this.setDeadState()
    }

    setDeadState() {
        this.lastState = this.state

        if (this.deadAbilitiesOrder.length == 0) {
            this.state = GameState.POST_LEGISLATIVE
            return
        }

        switch (this.deadAbilitiesOrder[0][1]) {
            case Ability.PEEK:
                this.state = GameState.ABILITY_PEEK
                break;
            case Ability.GIVE_INTEL:
                this.state = GameState.ABILITY_GIVE_INTEL
                break;
            case Ability.FORCE_EXAMINE:
                this.state = GameState.ABILITY_FORCE_EXAMINE
                break;
            case Ability.FORCE_EXECUTE:
                this.state = GameState.ABILITY_FORCE_EXECUTE
                break;
            case Ability.FORCE_ELECTION:
                this.state = GameState.ABILITY_FORCE_ELECTION
                break;
            default:
                this.state = GameState.POST_LEGISLATIVE
                break;
        }
    }

    peek() {
        if (this.state != GameState.ABILITY_PEEK) {
            throw new Error("Cannot peek at deck in this state.")
        }

        let peek = []
        for (let i = 0; i < 3 && i < this.draw.getSize(); i++) {
            peek.push(this.draw.peek(i))
        }

        return peek
    }

    // endPeek() {
    //     this.setDeadState();
    // }

    giveIntel(username) {
        if (this.state != GameState.ABILITY_GIVE_INTEL) {
            throw new Error("Cannot give intel in this state.")
        }
        
    }

    forceExaminePlayer(username) {
        if (this.state != GameState.ABILITY_FORCE_EXAMINE) {
            throw new Error("Cannot examine player in this state.")
        }

    }

    forceExecutePlayer(username) {
        if (this.state != GameState.ABILITY_FORCE_EXECUTE) {
            throw new Error("Cannot execute player in this state.")
        }

    }





    checkIfGameOver() {
        if (this.board.isTownVictory()) {
            this.lastState = this.state
            this.state = GameState.TOWN_VICTORY_FORTIFICATION
        }
        else if (this.isInfectedSwarmVictory()) {
            this.lastState = this.state
            this.state = GameState.INFECTED_VICTORY_SWARM
        }
        else if (this.isTownExterminationVictory()) {
            this.lastState = this.state
            this.state = GameState.TOWN_VICTORY_EXTERMINATION
        }
    }

    hasGameFinished() {
        return [GameState.INFECTED_VICTORY_ELECTION, GameState.INFECTED_VICTORY_SWARM, 
            GameState.TOWN_VICTORY_EXTERMINATION, GameState.TOWN_VICTORY_FORTIFICATION].includes(this.state)
    }

    isInfectedSwarmVictory() {
        let aliveCount = 0
        let infectedCount = 0

        for (const player of this.players) {
            if (!player.isAlive()) {continue}

            if (player.isBad()) {infectedCount += 1}
            aliveCount += 1
        }

        return infectedCount > aliveCount / 2
    }

    isTownExterminationVictory() {
        let infectedAlive = false
        for (const player of this.players) {
            if (!player.isAlive()) {continue}

            if (player.isBad()) {infectedAlive = true}
        }

        return !infectedAlive
    }

    getState() {
        return this.state
    }

    getLastState() {
        return this.lastState
    }

    getPlayer(username) {
        for (let player of this.players) {
            if (player.username == username) {
                return player
            }
        }
    }

    getPlayerList() {
        return this.players.slice()
    }

    hasPlayer(username) {
        if (username == null) {return false}
        for (const player of this.players) {
            if (player.username == username) {
                return true
            }
        }

        return false
    }

    getCurrentMayor() {
        return this.currMayor
    }

    getCurrentDoctor() {
        return this.currDoctor
    }

    getCurrentSheriff() {
        return this.currSheriff
    }

    getLastMayor() {
        return this.lastMayor
    }

    getLastDoctor() {
        return this.lastDoctor
    }

    getLastSheriff() {
        return this.lastSheriff
    }

    getTarget() {
        return this.target
    }

    getElectionTracker() {
        return this.electionTracker
    }

    getDidElectionTrackerAdvance() {
        return this.didElectionTrackerAdvance
    }

    getLastEnactedPolicy() {
        return this.lastEnactedPolicy
    }

    getDrawSize() {
        return this.draw.getSize()
    }

    getDiscardSize() {
        return this.discard.getSize()
    }

    getGraveyardSize() {
        return this.graveyard.getSize()
    }

    getNumFortificationPolicies() {
        return this.board.getNumFortificationPolicies()
    }

    getNumMedicalMilitaryPolicies() {
        return this.board.getNumMedicalMilitaryPolicies()
    }

    getNumOutbreakPolicies() {
        return this.board.getNumOutbreakPolicies()
    }

    getVotes() {
        let voteDict = {}
        this.voteMap.forEach((value, key) => voteDict[key] = value)
        return voteDict
    }

    getSupportLegislativeChoices() {
        return this.legislativePolicies.slice()
    }

    getMayorLegislativeChoices() {
        return this.mayoralPolicies.slice()
    }

    getLivingPlayerCount() {
        let numLivingPlayers = 0

        for (const player of this.players) {
            if (player.isAlive()) {numLivingPlayers += 1}
        }

        return numLivingPlayers
    }

    getDeadPlayerCount() {
        return this.players.length - this.getLivingPlayerCount()
    }

    hasPlayerVoted(username) {
        return this.voteMap.has(username)
    }

    anyDead() {
        for (const player of this.players) {
            if (!player.isAlive()) {
                return true
            }
        }
        return false
    }

    hasDeadPlayerActed(username) {
        return this.abilityMap.has(username)
    }

    sortPlayersByAbility(playerList, abilityMap) {
        return playerList.slice().sort((a, b) => {
            // Get ability order
            const abilityOrderA = AbilityOrder[abilityMap[a]];
            const abilityOrderB = AbilityOrder[abilityMap[b]];
            
            // Compare ability order
            if (abilityOrderA !== abilityOrderB) {
                return abilityOrderA - abilityOrderB;
            } else {
                // If abilities are equal, preserve the order in playerList
                return playerList.indexOf(a) - playerList.indexOf(b);
            }
        }).map(player => [player, abilityMap[player]]);
    }

    removeFortification() {
        if (this.board.getNumFortificationPolicies() <= 0 || this.board.getNumFortificationPolicies() >= 5) { return }

        this.board.numFortificationPolicies -= 1
        this.discard.addBottom(Policy.FORTIFICATION)
    }
    
    removeMedicalMilitary() {
        if (this.board.getNumMedicalMilitaryPolicies() <= 0 || this.board.getNumMedicalMilitaryPolicies() >= 3) { return }
        
        this.board.numMedicalMilitaryPolicies -= 1
        this.discard.addBottom(Policy.MEDICALMILITARY)
    }
    
    removeOutbreak() {
        if (this.board.getNumOutbreakPolicies() <= 0 || this.board.getNumOutbreakPolicies() >= 3) { return }

        this.board.numOutbreakPolicies -= 1
        this.discard.addBottom(Policy.OUTBREAK)
    }

    returnFortificationToDeck() {
        this.draw.add(Policy.FORTIFICATION)
    }

    returnMedicalMilitaryToDeck() {
        this.draw.add(Policy.MEDICALMILITARY)
    }

    returnOutbreakToDeck() {
        this.draw.add(Policy.OUTBREAK)
    }

}

export default Game

// console.log(new Game(["John", "Peter", "Stupid", "Stew", "trevor"]).getState())