import React from 'react';
import StatsBar from './StatsBar';
import CardSlots from './CardSlots';
import './HUD.css';

const HUD = ({ gameState, playerId, matchCountdown }) => {
    const p1 = gameState.players[1];
    const p2 = gameState.players[2];

    return (
        <div className="hud-container">
            <div className="hud-left">
                <div className="player-label">PLAYER 1 {playerId === 1 && '(YOU)'}</div>
                <div className="points-display">PTS: {p1.points}</div>
                <StatsBar player={p1} isLeft={true} />
            </div>

            <div className="hud-center">
                <div className="timer-box">
                    <span className="timer-label">{matchCountdown !== null ? 'START IN' : 'TIME'}</span>
                    <span className={`timer-value ${matchCountdown !== null ? 'countdown-active' : ''}`}>
                        {matchCountdown !== null ? matchCountdown : gameState.timer}
                    </span>
                </div>
                <CardSlots cards={playerId === 1 ? p1.cards : p2.cards} />
            </div>

            <div className="hud-right">
                <div className="player-label">PLAYER 2 {playerId === 2 && '(YOU)'}</div>
                <div className="points-display">PTS: {p2.points}</div>
                <StatsBar player={p2} isLeft={false} />
            </div>
        </div>
    );
};

export default HUD;
