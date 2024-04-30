import { Identity } from "./enums.js";

class Player {
    constructor(username) {
        this.username = username
        this.alive = true
        this.identity = Identity.UNASSIGNED
    }

    setIdentity(identity) {
        this.identity = identity
    }

    getIdentity() {
        return this.identity
    }

    isInfected() {
        return this.getIdentity() == Identity.INFECTED
    }

    isBitten() {
        return this.getIdentity() == Identity.BITTEN
    }

    isZombie() {
        return this.getIdentity() == Identity.ZOMBIE
    }

    isBad() {
        return this.isInfected() || this.isBitten() || this.isZombie()
    }

    kill() {
        this.alive = false
        this.transform()
    }

    isAlive() {
        return this.alive
    }
    
    transform() {
        if (this.isBad()) {this.setIdentity(Identity.ZOMBIE)}
        else {this.setIdentity(Identity.GHOST)}
    }

    infect() {
        this.setIdentity(Identity.BITTEN)
    }

    getUsername() {
        return this.username
    }

}

export default Player