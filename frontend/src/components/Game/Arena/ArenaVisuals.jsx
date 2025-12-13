import React from 'react';
import Character from './Character';
import './ArenaVisuals.css';

const ArenaVisuals = ({ players, actionQueue, setActionQueue }) => {
    const [currentAction, setCurrentAction] = React.useState(null);

    React.useEffect(() => {
        if (!currentAction && actionQueue.length > 0) {
            const nextAction = actionQueue[0];
            setCurrentAction({ ...nextAction, startTime: Date.now() });

            // Remove from queue after delay
            setTimeout(() => {
                setActionQueue(prev => prev.slice(1));
                setCurrentAction(null);
            }, 400);
        }
    }, [actionQueue, currentAction, setActionQueue]);

    const p1 = players[1];
    const p2 = players[2];

    // Use current action if available, otherwise idle
    const p1Action = currentAction ? currentAction.p1.action : 'idle';
    const p2Action = currentAction ? currentAction.p2.action : 'idle';

    const getPositionGroup = (pos) => {
        if (pos === 0 || pos === 1) return 'A';
        if (pos === 2 || pos === 3) return 'B';
        if (pos === 4 || pos === 5) return 'C';
        return '-';
    };

    return (
        <div className="arena-wrapper">
            {p1 && (
                <div className="position-indicator p1-indicator">
                    P1: {getPositionGroup(p1.position)}
                </div>
            )}
            <div className="game-arena-viewport">
                <div className="arena-background" style={{ backgroundImage: 'url(/assets/bg.jpg)' }}></div>

                {p1 && (
                    <Character
                        key="p1"
                        playerId={1}
                        position={p1.position}
                        action={p1Action}
                        isFlipped={false}
                        startTime={currentAction?.startTime}
                    />
                )}

                {p2 && (
                    <Character
                        key="p2"
                        playerId={2}
                        position={p2.position}
                        action={p2Action}
                        isFlipped={true}
                        startTime={currentAction?.startTime}
                    />
                )}

                <div className="position-groups">
                    <div className="group-label" style={{ left: '38%' }}>ZONE A</div>
                    <div className="group-label" style={{ left: '50%' }}>ZONE B</div>
                    <div className="group-label" style={{ left: '62%' }}>ZONE C</div>
                </div>
            </div>
            {p2 && (
                <div className="position-indicator p2-indicator">
                    P2: {getPositionGroup(p2.position)}
                </div>
            )}
        </div>
    );
};

export default ArenaVisuals;
