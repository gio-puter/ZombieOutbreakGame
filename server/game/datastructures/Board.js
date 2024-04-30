import { Policy, RolePower } from "./enums.js";

class Board {
    FORTIFICATION_POLICIES_TO_WIN = 5

    numFortificationPolicies = 0
    numOutbreakPolicies = 0
    numMedicalMilitaryPolicies = 0

    lastEnacted = null

    boardPolicies = []

    enactPolicy(policy) {
        if (this.isTownVictory()) { throw new Error("Cannot enact policy when victory conditions have been reached.")}

        switch (policy[0]) {
            case (Policy.FORTIFICATION):
                this.numFortificationPolicies += 1
            case (Policy.OUTBREAK):
                this.numOutbreakPolicies += 1
            case (Policy.MEDICALMILITARY):
                this.numMedicalMilitaryPolicies += 1
        }
                    
        this.boardPolicies.push(policy)
        this.lastEnacted = policy
    }

    getActivatedPower() {
        if (this.getNumMedicalMilitaryPolicies() >= 3) {
            this.numMedicalMilitaryPolicies = 0
            return RolePower.SUPPORT
        }
        else if (this.getNumOutbreakPolicies() >= 3) {
            this.numOutbreakPolicies = 0
            return RolePower.SPREAD
        } else {
            return RolePower.NONE
        }
    }

    isTownVictory() {
        return this.numFortificationPolicies >= this.FORTIFICATION_POLICIES_TO_WIN
    }

    getLastEnacted() {
        return this.lastEnacted
    }

    getNumFortificationPolicies() {
        return this.numFortificationPolicies
    }

    getNumOutbreakPolicies() {
        return this.numOutbreakPolicies
    }

    getNumMedicalMilitaryPolicies() {
        return this.numMedicalMilitaryPolicies
    }

    resetOutbreakPolicies() {
        this.numOutbreakPolicies = 0
    }

    resetMedicalMilitaryPolicies() {
        this.numMedicalMilitaryPolicies = 0
    }

}

export default Board