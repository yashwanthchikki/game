import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ onNavigate, isOpen, onToggle }) => {
    return (
        <div
            className={`sidebar ${isOpen ? 'open' : 'closed'}`}
            onMouseEnter={() => onToggle(true)}
            onMouseLeave={() => onToggle(false)}
        >
            <div className="sidebar-icon" onClick={() => onNavigate('profile')}>
                [P]
                <span className="sidebar-label">Profile</span>
            </div>
            <div className="sidebar-icon" onClick={() => onNavigate('game')}>
                [G]
                <span className="sidebar-label">Game</span>
            </div>
            <div className="sidebar-spacer"></div>
            <div className="sidebar-icon" onClick={() => onNavigate('settings')}>
                [S]
                <span className="sidebar-label">Settings</span>
            </div>
        </div>
    );
};

export default Sidebar;
