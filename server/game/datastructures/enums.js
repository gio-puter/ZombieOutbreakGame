export const Policy = Object.freeze({
    OUTBREAK: "OUTBREAK",
    MEDICALMILITARY: "MEDICALMILITARY",
    FORTIFICATION: "FORTIFICATION",
})

export const Ability = Object.freeze({
    FORCE_ELECTION: "FORCE_ELECTION", // force vote for new mayor
    FORCE_EXAMINE: "FORCE_EXAMINE", // force doctor to examine any player
    FORCE_EXECUTE: "FORCE_EXECUTE", // force sheriff to execute any player
    REMOVE_OUTBREAK: "REMOVE_OUTBREAK", // remove outbreak card from board (to discard)
    REMOVE_MEDICALMILITARY: "REMOVE_MEDICALMILITARY", // remove medical/military from board (to discard)
    REMOVE_FORTIFICATION: "REMOVE_FORTIFICATION", // remove fortification card from board (to discard)
    PEEK: "PEEK", // peek at top 3 cards on draw pile
    GIVE_INTEL: "GIVE_INTEL", // anonymously share information about player with another player
    // add other ideas
})

export const AbilityOrder = Object.freeze({
    FORCE_ELECTION: 5, // force vote for new mayor
    FORCE_EXAMINE: 3, // force doctor to examine any player
    FORCE_EXECUTE: 4, // force sheriff to execute any player
    REMOVE_OUTBREAK: 0, // remove outbreak card from board (to discard)
    REMOVE_MEDICALMILITARY: 0, // remove medical/military from board (to discard)
    REMOVE_FORTIFICATION: 0, // remove fortification card from board (to discard)
    PEEK: 1, // peek at top 3 cards on draw pile
    GIVE_INTEL: 2, // anonymously share information about player with another player
    // add other ideas
})

export const Identity = Object.freeze({
    UNASSIGNED: "UNASSIGNED",
    TOWN: "TOWN",
    INFECTED: "INFECTED",
    BITTEN: "BITTEN",
    ZOMBIE: "ZOMBIE",
    GHOST: "GHOST",
});

export const GameState = Object.freeze({
    SETUP: "SETUP", //setup game: cards, initial mayor, allegiances, etc.
    MAYOR_STAFF_SELECTION: "MAYOR_STAFF_SELECTION", //mayor appoints sherrif and doctor
    MAYOR_VOTING: "MAYOR_VOTING", // towns votes on if mayor should stay
    
    LEGISLATIVE_DOCTOR: "LEGISLATIVE_DOCTOR", // doctor selects card to give mayor
    LEGISLATIVE_SHERRIF: "LEGISLATIVE_SHERRIF", // sherrif selects card to give mayor
    LEGISLATIVE_MAYOR: "LEGISLATIVE_MAYOR", // mayor selects card to enact
    POST_LEGISLATIVE: "POST_LEGISLATIVE", // time for mayor to end round

    MAYOR_POWER_SELECTION: "MAYOR_SUPPORT_SELECTION", // mayor chooses whether doctor or sherrif uses their power
    SUPPORT_POWER_EXAMINE: "SUPPORT_POWER_EXAMINE", // doctor examines player's role
    SUPPORT_POWER_EXECUTE: "SUPPORT_POWER_EXECUTE", // sherrif kills player
    INFECT_SELECT: "INFECT_SELECT", // infected select player to infect

    DEAD_ACTION: "DEAD_ACTION", // dead choose their actions (ability or return card to draw pile)
    ABILITY_PEEK: "ABILITY_FORCE_ELECTION", // dead looks at top 3 cards of draw pile
    ABILITY_GIVE_INTEL: "ABILITY_FORCE_ELECTION", // dead choose player to give intel to about another player
    ABILITY_FORCE_EXAMINE: "ABILITY_FORCE_EXAMINE", // current doctor is forced to examine a player
    ABILITY_FORCE_EXECUTE: "ABILITY_FORCE_EXECUTE", // current sheriff is forced to execute a player
    ABILITY_FORCE_ELECTION: "ABILITY_FORCE_ELECTION", // election of a new mayor is forced

    TOWN_VICTORY_EXTERMINATION: "TOWN_VICTORY_EXTERMINATION", // town wins by killing all infected
    TOWN_VICTORY_FORTIFICATION: "TOWN_VICTORY_FORTIFICATION", // town wins by enacting 5 fortification cards
    INFECTED_VICTORY_SWARM: "INFECTED_VICTORY_SWARM", // infected wins by outnumbering town (only count alive infected and town)
    INFECTED_VICTORY_ELECTION: "INFECTED_VICTORY_ELECTION", // infected wins by having mayor, sherrif, doctor be infected
})

export const RolePower = Object.freeze({
    SPREAD: "SPREAD",
    SUPPORT: "SUPPORT",
    // INSPECT: "INSPECT",
    // EXECUTE: "EXECUTE",
    NONE: "NONE",
})