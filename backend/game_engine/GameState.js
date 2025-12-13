class GameState {
    constructor() {
        this.players = {
            1: {
                id: 1,
                hp: 100,
                mana: 100,
                ki: 0,
                position: 0,
                points: 0,
                cards: {
                    small_hp: { available: true, value: 30 },
                    big_hp: { available: true, value: 60 },
                    small_mana: { available: true, value: 30 },
                    big_mana: { available: true, value: 60 }
                },
                function_count: 0
            },
            2: {
                id: 2,
                hp: 100,
                mana: 100,
                ki: 0,
                position: 5,
                points: 0,
                cards: {
                    small_hp: { available: true, value: 30 },
                    big_hp: { available: true, value: 60 },
                    small_mana: { available: true, value: 30 },
                    big_mana: { available: true, value: 60 }
                },
                function_count: 0
            }
        };
        this.round = 1;
        this.timer = 480;
        this.messageQueue = [];
    }

    resetRound() {
        [1, 2].forEach(id => {
            this.players[id].hp = Math.min(100, this.players[id].hp + 10);
            this.players[id].mana = Math.min(100, this.players[id].mana + 10);
            this.players[id].position = id === 1 ? 0 : 5;
            this.players[id].cards = {
                small_hp: { available: true, value: 30 },
                big_hp: { available: true, value: 60 },
                small_mana: { available: true, value: 30 },
                big_mana: { available: true, value: 60 }
            };
        });
    }

    updateKi(playerId) {
        this.players[playerId].function_count++;
        if (this.players[playerId].function_count % 10 === 0) {
            this.players[playerId].ki = Math.min(100, this.players[playerId].ki + 5);
        }
    }
}

module.exports = GameState;
