import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../../socket';
import ArenaVisuals from './Arena/ArenaVisuals';
import IDE from './IDE/IDE';
import MessageLog from './MessageLog/MessageLog';
import StatsBar from './HUD/StatsBar';
import CardSlots from './HUD/CardSlots';
import './GameContainer.css';

const GameContainer = ({ gameId, playerId }) => {
    const [gameState, setGameState] = useState({
        players: {
            1: {
                hp: 100, mana: 100, ki: 100, position: 0, points: 0,
                cards: {
                    small_hp: { available: true },
                    big_hp: { available: true },
                    small_mana: { available: true },
                    big_mana: { available: true }
                }
            },
            2: {
                hp: 100, mana: 100, ki: 100, position: 5, points: 0,
                cards: {
                    small_hp: { available: true },
                    big_hp: { available: true },
                    small_mana: { available: true },
                    big_mana: { available: true }
                }
            }
        },
        timer: 480
    });

    console.log('GameContainer rendering. GameId:', gameId, 'PlayerId:', playerId);
    console.log('Current GameState:', gameState);
    const [actionQueue, setActionQueue] = useState([]);
    const [logs, setLogs] = useState([]);
    const [overlayContent, setOverlayContent] = useState(null); // { title, content }
    const [gameOver, setGameOver] = useState(null); // { winner: 1 or 2 }
    const [matchCountdown, setMatchCountdown] = useState(null);

    useEffect(() => {
        const onGameStats = (data) => {
            setMatchCountdown(null);
            setGameState(prev => ({
                ...prev,
                players: data.players,
                timer: data.timer
            }));
        };

        const onGameAction = (action) => {
            // Add to animation queue
            setActionQueue(prev => [...prev, action]);

            // Add to logs
            const logEntry = {
                p1: action.p1.action,
                p2: action.p2.action,
                p1Intended: action.p1.intended,
                p2Intended: action.p2.intended,
                timestamp: Date.now()
            };
            setLogs(prev => [...prev, logEntry]);
        };

        const onOpponentData = (data) => {
            setOverlayContent({
                title: data.type === 'code' ? "Opponent's Code" : "Opponent's Stack",
                content: data.content
            });
        };

        const onGameOver = (data) => {
            setGameOver(data);
        };

        const onMatchCountdown = (data) => {
            setMatchCountdown(data.count);
        };

        const onGameStart = () => {
            setMatchCountdown(null);
        };

        socket.on('game_stats', onGameStats);
        socket.on('game_action', onGameAction);
        socket.on('opponent_data', onOpponentData);
        socket.on('game_over', onGameOver);
        socket.on('match_countdown', onMatchCountdown);
        socket.on('game_start', onGameStart);

        return () => {
            socket.off('game_stats', onGameStats);
            socket.off('game_action', onGameAction);
            socket.off('opponent_data', onOpponentData);
            socket.off('game_over', onGameOver);
            socket.off('match_countdown', onMatchCountdown);
            socket.off('game_start', onGameStart);
        };
    }, []);

    const handlePushCode = (code, stack, cooldownCode) => {
        console.log("Pushing code:", code, stack, cooldownCode);
        socket.emit('push_code', { roomId: gameId, code, stack, cooldownCode });
    };

    const handleCompile = (code) => {
        return new Promise((resolve) => {
            socket.emit('compile_code', { code }, (response) => {
                resolve(response);
            });
        });
    };

    const handleViewOpponentCode = () => {
        socket.emit('get_opponent_data', { roomId: gameId, type: 'code' });
    };

    const handleViewOpponentStack = () => {
        socket.emit('get_opponent_data', { roomId: gameId, type: 'stack' });
    };

    const myCards = gameState.players[playerId]?.cards || gameState.players[1].cards;

    return (
        <div className="game-container">
            {/* TOP SECTION: Stats | Arena | Stats */}
            <div className="game-top-section">
                <div className="player-stats-panel left">
                    <h3 className="player-title">PLAYER 1 {playerId === 1 && '(YOU)'}</h3>
                    <div className="player-score">PTS: {gameState.players[1].points}</div>
                    <StatsBar player={gameState.players[1]} isLeft={true} />
                </div>

                <div className="arena-center-panel">
                    <div className="arena-header-overlay">
                        <span className="game-timer">
                            {matchCountdown !== null ? `START: ${matchCountdown}` : `TIME: ${gameState.timer}`}
                        </span>
                    </div>

                    <div className="arena-viewport">
                        <ArenaVisuals
                            players={gameState.players}
                            actionQueue={actionQueue}
                            setActionQueue={setActionQueue}
                        />
                    </div>

                    <div className="arena-footer-overlay">
                        <CardSlots cards={myCards} />
                    </div>
                </div>

                <div className="player-stats-panel right">
                    <h3 className="player-title">PLAYER 2 {playerId === 2 && '(YOU)'}</h3>
                    <div className="player-score">PTS: {gameState.players[2].points}</div>
                    <StatsBar player={gameState.players[2]} isLeft={false} />
                </div>
            </div>

            {/* BOTTOM SECTION: IDE | Logs */}
            <div className="game-bottom-section">
                <div className="ide-wrapper">
                    <IDE
                        onPushCode={handlePushCode}
                        onCompile={handleCompile}
                        onViewOpponentCode={handleViewOpponentCode}
                        onViewOpponentStack={handleViewOpponentStack}
                    />
                </div>
                <div className="log-wrapper">
                    <MessageLog logs={logs} />
                </div>
            </div>

            {/* MODALS */}
            {overlayContent && (
                <div className="modal-overlay" onClick={() => setOverlayContent(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>{overlayContent.title}</h3>
                        <pre>{overlayContent.content}</pre>
                        <button className="tui-btn" onClick={() => setOverlayContent(null)}>CLOSE</button>
                    </div>
                </div>
            )}

            {gameOver && (
                <div className="modal-overlay">
                    <div className="modal-content game-over-content">
                        <h2>GAME OVER</h2>
                        <h3>{gameOver.winner === 'draw' ? 'DRAW MATCH' : (gameOver.winner === playerId ? 'VICTORY' : 'DEFEAT')}</h3>
                        <p>{gameOver.winner === 'draw' ? 'No Winner' : `Winner: Player ${gameOver.winner}`}</p>
                        <button className="tui-btn" onClick={() => window.location.reload()}>BACK TO LOBBY</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameContainer;
