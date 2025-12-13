class GameState {
    constructor() {
        this.players = {
            1: {
                id: 1,
                hp: 100,
                mana: 100,
                ki: 0, // Start with 0 Ki, regenerates over time
                position: 0, // 0, 2, 4
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
                ki: 0, // Start with 0 Ki, regenerates over time
                position: 5, // 1, 3, 5 -> now 5 (Extreme Right)
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
        this.timer = 480; // 8 minutes in seconds
        this.messageQueue = [];
    }

    resetRound() {
        // Reset stats but keep points? Or reset everything?
        // Instructions say: "Stats reset between rounds (except cards)"
        // But prompt says: "hp and mana increse 10 points avarall" (maybe recovery?)
        // Let's reset to 100 for now, or maybe 100 + 10?
        // "Natural HP/Mana recovery per round" implies they carry over?
        // If they carry over, we add 10. If they reset, we set to 100.
        // "Victory Conditions: Most HP at end OR opponent reaches 0 HP"
        // Usually fighting games reset HP. But "recovery" implies persistence.
        // I will implement persistence + recovery for now as it's more complex/interesting.

        [1, 2].forEach(id => {
            this.players[id].hp = Math.min(100, this.players[id].hp + 10);
            this.players[id].mana = Math.min(100, this.players[id].mana + 10);
            // Reset positions
            this.players[id].position = id === 1 ? 0 : 5;
            // Reset cards? "except cards" usually means they DON'T reset (use once per match?) 
            // OR "4 cards avilable for each player for each round" -> They RESET.
            // "except cards" in instructions might mean something else.
            // Prompt: "4 cards avilable for each player for each round" -> They RESET.
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
