import React from 'react';
import './Character.css';

const ACTION_MAP = {
    'idle': 'Idle.png',
    'run': 'Run.png',
    'runopp': 'Runopp.png',
    'runattack': 'Run+Attack.png',
    'attack1': 'Attack 1.png',
    'attack2': 'Attack 2.png',
    'attack3': 'Attack 3.png',
    'defend': 'Defend.png',
    'hurt': 'Hurt.png',
    'dead': 'Dead.png',
    'jump': 'Jump.png',
    'push': 'Run+Attack.png', // Fallback for push if no sprite
    'cooldown': 'Idle.png'
};

const FRAME_COUNTS = {
    'idle': 6,
    'run': 8,
    'runopp': 8,
    'runattack': 7,
    'attack1': 10,
    'attack2': 8,
    'attack3': 5,
    'defend': 4,
    'hurt': 3,
    'push': 6,
    'dead': 9,
    'jump': 8,
    'cooldown': 6
};

const POSITIONS = [35, 41, 47, 53, 59, 65]; // Tightly compressed for melee overlap

const Character = ({ playerId, position, action, isFlipped, startTime }) => {
    const [frame, setFrame] = React.useState(0);

    // Normalize action to lowercase for mapping
    const actionKey = (action || 'idle').toLowerCase();
    const filename = ACTION_MAP[actionKey] || 'Idle.png';
    const totalFrames = FRAME_COUNTS[actionKey] || 6;

    // Reset frame when action changes
    React.useEffect(() => {
        setFrame(0);
    }, [actionKey]);

    React.useEffect(() => {
        let animationFrameId;

        const animate = () => {
            const now = Date.now();
            // If explicit startTime provided (action phase), use it. 
            // Otherwise use a cycling time based on epoch for sync idle? 
            // Or just local start. Since we want sync, epoch based is best for loops.

            let currentFrame = 0;
            const duration = 400; // ms

            if (['idle', 'run', 'runopp', 'cooldown'].includes(actionKey)) {
                // Looping animations
                // Use epoch time to sync idle animations across chars
                const elapsed = now;
                const totalCycle = duration;
                // We want to map 0..duration -> 0..totalFrames
                const cyclePos = elapsed % totalCycle;
                currentFrame = Math.floor((cyclePos / totalCycle) * totalFrames);
            } else {
                // One-shot animations (Attack, etc)
                // Use startTime if available, else standard
                const start = startTime || now;
                const elapsed = now - start;
                const progress = elapsed / duration;

                if (progress >= 1) {
                    currentFrame = totalFrames - 1; // Hold last frame
                } else {
                    currentFrame = Math.floor(progress * totalFrames);
                }
            }

            setFrame(currentFrame);
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => cancelAnimationFrame(animationFrameId);
    }, [actionKey, totalFrames, startTime]);

    // Determine folder
    const folder = playerId === 1 ? 'Knight_1' : 'Knight_2';
    const src = `/assets/${folder}/${filename}`;

    const isMovementAction = ['run', 'runopp', 'runattack', 'attack1'].includes(actionKey);

    // Safety check for frame index
    const safeFrame = frame < totalFrames ? frame : 0;

    const style = {
        left: `${POSITIONS[position]}%`,
        transform: isFlipped ? 'scaleX(-1) translateX(50%) scale(1.8)' : 'translateX(-50%) scale(1.8)',
        transformOrigin: 'bottom center',
        transition: isMovementAction ? 'left 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
        zIndex: 10 + position,
        backgroundImage: `url(${src})`,
        backgroundPosition: `-${safeFrame * 128}px 0`,
        width: '100px',
        height: '130px',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'auto 130px'
    };

    return (
        <div className="character-container" style={style}>
            {/* Sprite rendered via background */}
        </div>
    );
};

export default Character;
