class Deck {
    constructor() {
        this.deck = []
    }

    getSize() {
        return this.deck.length
    }

    isEmpty() {
        return this.getSize() == 0
    }

    add(card) {
        this.deck.unshift(card)
    }

    addBottom(card) {
        this.deck.push(card)
    }

    remove() {
        if (this.isEmpty()) {return}
        return this.deck.shift()
    }

    peek(index) {
        return this.deck[index]
    }

    shuffle() {
        this.deck.sort(() => Math.random() - 0.5)
    }
}

export default Deck