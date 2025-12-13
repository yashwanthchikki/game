import React from 'react';
import './StatsBar.css';

const Bar = ({ label, value, max, color }) => {
    const width = `${(value / max) * 100}%`;
    return (
        <div className="stat-bar-container">
            <div className="stat-label">{label}</div>
            <div className="stat-track">
                <div
                    className="stat-fill"
                    style={{ width, backgroundColor: color }}
                ></div>
                <div className="stat-value">{value}/{max}</div>
            </div>
        </div>
    );
};

const StatsBar = ({ player, isLeft }) => {
    return (
        <div className={`stats-panel ${isLeft ? 'left' : 'right'}`}>
            <Bar label="HP" value={player.hp} max={100} color="#f00" />
            <Bar label="MANA" value={player.mana} max={100} color="#00f" />
            <Bar label="KI" value={player.ki} max={100} color="#ff0" />
        </div>
    );
};

export default StatsBar;
