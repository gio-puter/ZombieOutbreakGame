import { GameState, Identity } from "./game/datastructures/enums.js"

class GameToJSON {

    // static mapToJSON(map) {
    //     // Convert Map to Array of key-value pairs
    //     const array = Array.from(map, ([key, value]) => {
    //         // If the value is another Map, recursively convert it
    //         if (value instanceof Map) {
    //         return [key, mapToJSON(value)];
    //         } else {
    //         return [key, value];
    //         }
    //     });
    //     return Object.fromEntries(array);
    // }
    
    // static JSONToMap(json) {
    //     if (typeof json !== 'object' || json === null) {
    //       return json;
    //     }
        
    //     if (Array.isArray(json)) {
    //       // If the JSON object is an array, map over its elements and recursively convert them
    //       return json.map(JSONToMap);
    //     } else {
    //       // If the JSON object is an object, map over its key-value pairs and recursively convert them
    //       return Object.entries(json).reduce((acc, [key, value]) => {
    //         acc[key] = JSONToMap(value);
    //         if (Array.isArray(value) && value.length === 2 && value[0] && value[1]) {
    //           // If the value is an array with two elements and both are defined, treat it as a key-value pair for a Map
    //           acc[key] = new Map(JSONToMap(value));
    //         }
    //         return acc;
    //       }, {});
    //     }
    //   }

    static convert(game, username) {
        if (game == null) {
            throw new Error()
        }

        const dict = {}
        const playerData = {}
        const playerOrder = []
        const playerList = game.getPlayerList()

        const role = game.getPlayer(username).getIdentity()
        const showAllRoles = game.hasGameFinished() || game.getPlayer(username).isBad()

        for (const player of playerList) {
            const playerObject = {}

            playerObject.alive = player.isAlive()
            
            if (player.getUsername() == username || showAllRoles) {
                playerObject.id = player.getIdentity()
            }

            playerData[player.getUsername()] = playerObject
            playerOrder.push(player.getUsername())
        }

        dict.players = playerData
        dict.playerOrder = playerOrder

        dict.state = game.getState()
        dict.mayor = game.getCurrentMayor()
        dict.doctor = game.getCurrentDoctor()
        dict.sheriff = game.getCurrentSheriff()
        dict.lastState = game.getLastState()
        dict.lastMayor = game.getLastMayor()
        dict.lastDoctor = game.getLastDoctor()
        dict.lastSheriff = game.getLastSheriff()
        dict.targetUser = game.getTarget()

        dict.electionTracker = game.getElectionTracker()
        dict.electionTrackerAdvanced = game.getDidElectionTrackerAdvance()

        dict.lastPolicy = game.getLastEnactedPolicy()

        dict.drawSize = game.getDrawSize()
        dict.discardSize = game.getDiscardSize()
        dict.graveyardSize = game.getGraveyardSize()
        dict.fortificationPolicies = game.getNumFortificationPolicies()
        dict.medicalmilitaryPolicies = game.getNumMedicalMilitaryPolicies()
        dict.outbreakPolicies = game.getNumOutbreakPolicies()
        dict.userVotes = game.getVotes()

        if (game.getState() == GameState.LEGISLATIVE_MAYOR) {
            dict.mayorChoices = game.getMayorLegislativeChoices()
        }
        if (game.getState() == GameState.LEGISLATIVE_DOCTOR || game.getState() == GameState.LEGISLATIVE_SHERRIF) {
            dict.supportChoices = game.getSupportLegislativeChoices()
        }
        if (game.getState() == GameState.ABILITY_PEEK) {
            dict.peek = game.peek()
        }
        
        return dict
        // return JSON.stringify(dict)
    }
}

export default GameToJSON