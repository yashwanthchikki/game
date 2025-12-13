import React from 'react';
import './CardSlots.css';

const Card = ({ name, data }) => {
    if (!data) return <div className="card-slot used"><div className="card-name">{name}</div></div>;
    return (
        <div className={`card-slot ${data.available ? 'active' : 'used'}`}>
            <div className="card-name">{name}</div>
            <div className="card-status">{data.available ? 'READY' : 'USED'}</div>
        </div>
    );
};

const CardSlots = ({ cards }) => {
    if (!cards) return null;
    return (
        <div className="cards-container">
            <Card name="S-HP" data={cards.small_hp} />
            <Card name="B-HP" data={cards.big_hp} />
            <Card name="S-MP" data={cards.small_mana} />
            <Card name="B-MP" data={cards.big_mana} />
        </div>
    );
};

export default CardSlots;
