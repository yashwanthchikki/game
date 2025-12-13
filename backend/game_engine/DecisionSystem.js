const GameState = require('./GameState');

class DecisionSystem {
    constructor() {
        this.COSTS = {
            attack1: { mana: 20 },
            attack2: { mana: 15, ki: 15 }, // Stamina merged into Ki
            attack3: { ki: 20 }, // Stamina merged into Ki
            run: { ki: 5 },
            runopp: { ki: 5 },
            runattack: { ki: 20 }, // Stamina(15) + Ki(5) = 20 Ki
            push: { ki: 15 }, // Stamina merged into Ki
            defend: {},
            idle: {},
            hurt: {},
            dead: {},
            cooldown: {}
        };

        this.DAMAGE = {
            attack1: { same: 20, adj: 10 },
            attack2: { same: 15 },
            attack3: { same: 10 },
            runattack: { adj: 15 } // "Only damages if moving into adjacent position"
        };
    }

    processTurn(gameState, p1Action, p2Action) {
        // 1. Validate resources
        const p1Valid = this.validateAction(gameState.players[1], p1Action);
        const p2Valid = this.validateAction(gameState.players[2], p2Action);

        const act1 = p1Valid ? p1Action : 'idle';
        const act2 = p2Valid ? p2Action : 'idle';

        // 2. Consume resources
        this.consumeResources(gameState.players[1], act1);
        this.consumeResources(gameState.players[2], act2);

        // 3. Determine Outcome
        // This is complex because movement happens simultaneously with attacks.
        // We need to calculate "intended" positions first?
        // Or resolve movement then damage?
        // "P1: run, P2: attack1 -> Movement + conditional damage"
        // This suggests movement might happen or be interrupted.
        // For simplicity, we'll calculate damage based on INITIAL positions, 
        // unless the action is specifically movement-based interaction.
        // Actually, "runattack" implies moving THEN attacking.

        // Let's determine the resulting animations/states.
        let res1 = act1;
        let res2 = act2;
        let dmg1 = 0;
        let dmg2 = 0;

        const p1Pos = gameState.players[1].position;
        const p2Pos = gameState.players[2].position;

        // Resolve P1 Action vs P2
        if (this.isAttack(act1)) {
            const damage = this.calculateDamage(act1, p1Pos, p2Pos);
            if (damage > 0) {
                if (act2 === 'defend') {
                    dmg2 += damage * 0.5; // 50% reduction
                } else if (act2 !== 'run' && act2 !== 'runopp') { // If running, might dodge?
                    dmg2 += damage;
                    res2 = 'hurt'; // Interrupt P2 action?
                    // "if P1: attack1, P2: idle -> P1 gets attack1, P2 gets hurt"
                    // "if P1: attack1, P2: attack1 -> Both deal damage" (Both get hurt? or just take damage?)
                    // Usually in fighting games, if both attack, they both animate attack AND take damage.
                    // But "hurt" animation usually overrides.
                    // Let's say if you get hit, you play "hurt" UNLESS you are also attacking (trade).
                    // But the prompt says: "P1: attack1, P2: idle -> P1 gets attack1, P2 gets hurt"
                    // This implies P2's idle is replaced by hurt.
                    // If P2 was attacking, maybe they still attack?
                    // "P1: attack1, P2: attack1 -> Both deal damage" -> Both play attack animation?
                    // I will assume: If you attack, you play attack (even if hit). If you idle/run/defend and get hit, you play hurt.
                } else {
                    // P2 is running. Does it hit?
                    // "run" moves forward. "runopp" moves back.
                    // If P2 moves out of range, maybe miss?
                    // For now, calculate based on initial pos.
                    dmg2 += damage;
                    // If hit while running, maybe still hurt?
                    res2 = 'hurt';
                }
            }
        }

        // Resolve P2 Action vs P1
        if (this.isAttack(act2)) {
            const damage = this.calculateDamage(act2, p2Pos, p1Pos); // Note: p2Pos is attacker
            if (damage > 0) {
                if (act1 === 'defend') {
                    dmg1 += damage * 0.5;
                } else if (act1 !== 'run' && act1 !== 'runopp') {
                    dmg1 += damage;
                    if (!this.isAttack(act1)) { // Only override if not attacking
                        res1 = 'hurt';
                    }
                } else {
                    dmg1 += damage;
                    res1 = 'hurt';
                }
            }
        }

        // Apply Damage
        gameState.players[1].hp = Math.max(0, gameState.players[1].hp - dmg1);
        gameState.players[2].hp = Math.max(0, gameState.players[2].hp - dmg2);

        // Handle Movement (if not hurt?)
        // If 'hurt', do you still move? Usually no.
        if (res1 === 'run') {
            if (!this.move(gameState.players[1], 1)) res1 = 'jump';
        }
        if (res1 === 'runopp') {
            if (!this.move(gameState.players[1], -1)) res1 = 'jump';
        }
        if (res1 === 'runattack') this.move(gameState.players[1], 1);

        // P2 Movement
        if (res2 === 'run') {
            if (!this.move(gameState.players[2], 1)) res2 = 'jump';
        }
        if (res2 === 'runopp') {
            if (!this.move(gameState.players[2], -1)) res2 = 'jump';
        }

        // Handle Push
        if (res1 === 'push') this.handlePush(gameState, 1, 2);
        if (res2 === 'push') this.handlePush(gameState, 2, 1);

        // Update Ki (every 10 functions)
        gameState.updateKi(1);
        gameState.updateKi(2);

        return {
            p1: { action: res1, damageTaken: dmg1 },
            p2: { action: res2, damageTaken: dmg2 }
        };
    }

    validateAction(player, action) {
        const cost = this.COSTS[action];
        if (!cost) return false;
        if (player.mana < (cost.mana || 0)) return false;
        if (player.ki < (cost.ki || 0)) return false;
        return true;
    }

    consumeResources(player, action) {
        const cost = this.COSTS[action];
        if (!cost) {
            // Check for card usage
            if (action.startsWith('use_card_')) {
                this.applyCardEffect(player, action);
            }
            return;
        }
        player.mana -= (cost.mana || 0);
        player.ki -= (cost.ki || 0);
    }

    applyCardEffect(player, action) {
        const cardType = action.replace('use_card_', '');
        const card = player.cards[cardType];

        if (card && card.available) {
            card.available = false; // Mark as used

            if (cardType.includes('hp')) {
                player.hp = Math.min(100, player.hp + card.value);
            } else if (cardType.includes('mana')) {
                player.mana = Math.min(100, player.mana + card.value);
            }
        }
    }

    isAttack(action) {
        return ['attack1', 'attack2', 'attack3', 'runattack'].includes(action);
    }

    move(player, direction) {
        // P1: 0, 2, 4. Index 0, 1, 2 in "P1 positions array"?
        // Let's just use raw positions.
        // P1: 0 -> 2 -> 4. (+2)
        // P2: 5 -> 3 -> 1. (-2)

        const step = player.id === 1 ? 2 : -2;
        const newPos = player.position + (direction * step);

        // Bounds check
        if (player.id === 1) {
            if (newPos >= 0 && newPos <= 4) {
                player.position = newPos;
                return true;
            }
        } else {
            if (newPos >= 1 && newPos <= 5) {
                player.position = newPos;
                return true;
            }
        }
        return false; // Triggers jump in processTurn
    }

    calculateDamage(action, attackerPos, defenderPos) {
        // Groups: A(0,1), B(2,3), C(4,5)
        // Distance: |GroupA - GroupB|?
        const getGroup = (pos) => Math.floor(pos / 2);
        const g1 = getGroup(attackerPos);
        const g2 = getGroup(defenderPos);
        const dist = Math.abs(g1 - g2);

        if (action === 'attack1') {
            if (dist === 0) return this.DAMAGE.attack1.same;
            if (dist === 1) return this.DAMAGE.attack1.adj;
            return 0;
        }
        if (action === 'attack2') {
            if (dist === 0) return this.DAMAGE.attack2.same;
            return 0;
        }
        if (action === 'attack3') {
            if (dist === 0) return this.DAMAGE.attack3.same;
            return 0;
        }
        if (action === 'runattack') {
            // "Only damages if moving into adjacent position"
            // This implies we need to know the movement.
            // If dist was 1, and we move in, dist becomes 0.
            // For now, let's say if dist is 1, it hits.
            if (dist === 1) return this.DAMAGE.runattack.adj;
            return 0;
        }
        return 0;
    }

    handlePush(gameState, pusherId, pushedId) {
        // "Pushes opponent back one position if in same group"
        const pusher = gameState.players[pusherId];
        const pushed = gameState.players[pushedId];

        // Groups: A(0,1), B(2,3), C(4,5)
        const g1 = Math.floor(pusher.position / 2);
        const g2 = Math.floor(pushed.position / 2);

        if (g1 === g2) {
            // Push Logic
            // P1 (0,2,4) pushes P2 (1,3,5) -> P2 moves RIGHT (+2)
            // P2 (1,3,5) pushes P1 (0,2,4) -> P1 moves LEFT (-2)

            if (pusherId === 1) {
                // P1 pushes P2. P2 moves to next group (Right)
                // If P2 is at 1 (Group A), move to 3 (Group B)
                // If P2 is at 3 (Group B), move to 5 (Group C)
                // If P2 is at 5 (Group C), cannot move further
                if (pushed.position < 5) pushed.position += 2;
            } else {
                // P2 pushes P1. P1 moves to prev group (Left)
                // If P1 is at 4 (Group C), move to 2 (Group B)
                // If P1 is at 2 (Group B), move to 0 (Group A)
                // If P1 is at 0 (Group A), cannot move further
                if (pushed.position > 0) pushed.position -= 2;
            }
        }
    }
}

module.exports = DecisionSystem;
