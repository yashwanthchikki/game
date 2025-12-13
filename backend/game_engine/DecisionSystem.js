const GameState = require('./GameState');

class DecisionSystem {
    constructor() {
        this.COSTS = {
            attack1: { mana: 20 },
            attack2: { mana: 15, ki: 15 },
            attack3: { ki: 20 },
            run: { ki: 5 },
            runopp: { ki: 5 },
            runattack: { ki: 20 },
            push: { ki: 15 },
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
            runattack: { adj: 15 }
        };
    }

    processTurn(gameState, p1Action, p2Action) {
        const p1Valid = this.validateAction(gameState.players[1], p1Action);
        const p2Valid = this.validateAction(gameState.players[2], p2Action);

        const act1 = p1Valid ? p1Action : 'idle';
        const act2 = p2Valid ? p2Action : 'idle';

        this.consumeResources(gameState.players[1], act1);
        this.consumeResources(gameState.players[2], act2);

        let res1 = act1;
        let res2 = act2;
        let dmg1 = 0;
        let dmg2 = 0;

        const p1Pos = gameState.players[1].position;
        const p2Pos = gameState.players[2].position;

        if (this.isAttack(act1)) {
            const damage = this.calculateDamage(act1, p1Pos, p2Pos);
            if (damage > 0) {
                if (act2 === 'defend') {
                    dmg2 += damage * 0.5;
                } else if (act2 !== 'run' && act2 !== 'runopp') {
                    dmg2 += damage;
                    res2 = 'hurt';
                } else {
                    dmg2 += damage;
                    res2 = 'hurt';
                }
            }
        }

        if (this.isAttack(act2)) {
            const damage = this.calculateDamage(act2, p2Pos, p1Pos);
            if (damage > 0) {
                if (act1 === 'defend') {
                    dmg1 += damage * 0.5;
                } else if (act1 !== 'run' && act1 !== 'runopp') {
                    dmg1 += damage;
                    if (!this.isAttack(act1)) {
                        res1 = 'hurt';
                    }
                } else {
                    dmg1 += damage;
                    res1 = 'hurt';
                }
            }
        }

        gameState.players[1].hp = Math.max(0, gameState.players[1].hp - dmg1);
        gameState.players[2].hp = Math.max(0, gameState.players[2].hp - dmg2);

        if (res1 === 'run') {
            if (!this.move(gameState.players[1], 1)) res1 = 'jump';
        }
        if (res1 === 'runopp') {
            if (!this.move(gameState.players[1], -1)) res1 = 'jump';
        }
        if (res1 === 'runattack') this.move(gameState.players[1], 1);

        if (res2 === 'run') {
            if (!this.move(gameState.players[2], 1)) res2 = 'jump';
        }
        if (res2 === 'runopp') {
            if (!this.move(gameState.players[2], -1)) res2 = 'jump';
        }

        if (res1 === 'push') this.handlePush(gameState, 1, 2);
        if (res2 === 'push') this.handlePush(gameState, 2, 1);

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
            card.available = false;

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
        const step = player.id === 1 ? 2 : -2;
        const newPos = player.position + (direction * step);

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
        return false;
    }

    calculateDamage(action, attackerPos, defenderPos) {
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
            if (dist === 1) return this.DAMAGE.runattack.adj;
            return 0;
        }
        return 0;
    }

    handlePush(gameState, pusherId, pushedId) {
        const pusher = gameState.players[pusherId];
        const pushed = gameState.players[pushedId];

        const g1 = Math.floor(pusher.position / 2);
        const g2 = Math.floor(pushed.position / 2);

        if (g1 === g2) {
            if (pusherId === 1) {
                if (pushed.position < 5) pushed.position += 2;
            } else {
                if (pushed.position > 0) pushed.position -= 2;
            }
        }
    }
}

module.exports = DecisionSystem;
