import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import './ProfilePage.css';

// Basic list of countries
const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
    "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
    "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia",
    "Comoros", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
    "Denmark", "Djibouti", "Dominica", "Dominican Republic",
    "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia",
    "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea",
    "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait",
    "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
    "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius",
    "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
    "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Norway",
    "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent", "Samoa", "San Marino",
    "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
    "Solomon Islands", "Somalia", "South Africa", "Spain", "Sri Lanka", "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland",
    "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
    "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
    "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const ProfilePage = ({ username, sessionScore, targetUsername, onNavigateToProfile }) => {
    const isMyProfile = !targetUsername || targetUsername === username;
    const displayUsername = targetUsername || username;

    const [customSections, setCustomSections] = useState([
        { id: 1, label: 'LinkedIn', value: 'linkedin.com/in/' + (displayUsername || 'user') }
    ]);
    const [isEditing, setIsEditing] = useState(false);
    const [newSection, setNewSection] = useState({ label: '', value: '' });
    const [country, setCountry] = useState('');
    const [company, setCompany] = useState('');
    const [profileScore, setProfileScore] = useState(0);
    const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);

    // Friend System State
    const [friends, setFriends] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('friends');

    const token = localStorage.getItem('token');
    const { showToast } = useToast();

    const [rankings, setRankings] = useState([]);
    const [rankingPage, setRankingPage] = useState(0);
    const [hasMoreRankings, setHasMoreRankings] = useState(true);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    useEffect(() => {
        setCustomSections([]);
        setCountry('');
        setCompany('');
        setProfileScore(0);
        setIsEditing(false);

        fetchFriends();
        fetchProfile();

        // Reset ranking view when switching profiles
        setShowLeaderboard(false);
    }, [displayUsername, isMyProfile, token]);

    useEffect(() => {
        if (showLeaderboard) {
            fetchRankings(0, true);
        }
    }, [showLeaderboard]);

    const fetchRankings = async (page = 0, reset = false) => {
        try {
            const limit = 50;
            const offset = page * limit;
            const res = await fetch(`http://127.0.0.1:5001/api/rankings?limit=${limit}&offset=${offset}`);
            if (res.ok) {
                const data = await res.json();
                if (data.length < limit) setHasMoreRankings(false);

                if (reset) {
                    setRankings(data);
                } else {
                    setRankings(prev => [...prev, ...data]);
                }
            }
        } catch (e) { console.error(e); }
    };

    const loadMoreRankings = () => {
        const nextPage = rankingPage + 1;
        setRankingPage(nextPage);
        fetchRankings(nextPage);
    };

    const fetchProfile = async () => {
        try {
            let url = 'http://127.0.0.1:5001/api/profile/get';
            if (!isMyProfile) {
                url = `http://127.0.0.1:5001/api/profile/user/${displayUsername}`;
            }

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.customSections && data.customSections.length > 0) setCustomSections(data.customSections);
                if (data.country) setCountry(data.country);
                if (data.company) setCompany(data.company);
                if (data.score !== undefined) setProfileScore(data.score);
            }
        } catch (e) { console.error(e); }
    };

    const saveProfile = async () => {
        try {
            await fetch('http://127.0.0.1:5001/api/profile/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ customSections, country, company })
            });
            showToast('Profile Updated', 'success');
        } catch (e) { console.error(e); }
    };

    const toggleEdit = () => {
        if (isEditing) {
            saveProfile();
        }
        setIsEditing(!isEditing);
    };

    const fetchFriends = async () => {
        try {
            const res = await fetch('http://127.0.0.1:5001/api/friends/list', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFriends(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`http://127.0.0.1:5001/api/users/search?q=${searchQuery}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data.filter(u => u.username !== displayUsername));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const sendConnect = async (friendId) => {
        try {
            await fetch('http://127.0.0.1:5001/api/friends/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ friendId })
            });
            showToast('Request Sent!', 'success');
            setSearchResults(prev => prev.filter(u => u.id !== friendId));
            fetchFriends();
        } catch (e) { console.error(e); }
    };

    const acceptConnect = async (friendId) => {
        try {
            await fetch('http://127.0.0.1:5001/api/friends/accept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ friendId })
            });
            showToast('Request Accepted', 'success');
            fetchFriends();
        } catch (e) { console.error(e); }
    };

    const disconnectUser = async (friendId) => {
        if (!confirm("Disconnect user?")) return;
        try {
            await fetch('http://127.0.0.1:5001/api/friends/disconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ friendId })
            });
            showToast('User Disconnected', 'info');
            fetchFriends();
        } catch (e) { console.error(e); }
    };

    const handleAddSection = () => {
        if (newSection.label && newSection.value) {
            setCustomSections([...customSections, { id: Date.now(), ...newSection }]);
            setNewSection({ label: '', value: '' });
        }
    };

    const deleteSection = (id) => {
        setCustomSections(customSections.filter(s => s.id !== id));
    };

    const updateSection = (id, newValue) => {
        setCustomSections(customSections.map(section =>
            section.id === id ? { ...section, value: newValue } : section
        ));
    };

    const handleCountryChange = (e) => {
        const val = e.target.value;
        setCountry(val);
        setShowCountrySuggestions(val.length > 0);
    };

    const selectCountry = (val) => {
        setCountry(val);
        setShowCountrySuggestions(false);
    };

    return (
        <div className="profile-container">
            <div className="profile-grid">
                {/* Left Column: Profile Card */}
                <div className="profile-left">
                    {!isMyProfile && (
                        <button className="tui-btn-xs" style={{ alignSelf: 'flex-start', marginBottom: '1rem' }} onClick={() => onNavigateToProfile(null)}>
                            ← Back to My Profile
                        </button>
                    )}
                    <div className="tui-panel profile-card">
                        <div className="profile-info">
                            <h2 className="tui-text-primary">{displayUsername}</h2>
                            <div style={{ marginBottom: '10px', color: '#ffcc00' }}>
                                Global Score: {profileScore}
                            </div>
                            {isMyProfile && (
                                <button className="tui-btn-sm" onClick={toggleEdit}>
                                    {isEditing ? 'DONE' : 'EDIT PROFILE'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="tui-panel custom-sections">
                        <h3>PROFILE DETAILS</h3>
                        <div className="sections-list">
                            <div className="custom-section-item" style={{ position: 'relative', overflow: 'visible' }}>
                                <span className="section-label">Country:</span>
                                {isEditing ? (
                                    <>
                                        <input
                                            className="tui-input-sm"
                                            style={{ width: '60%' }}
                                            value={country}
                                            onChange={handleCountryChange}
                                            onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 200)}
                                            placeholder="Enter Country"
                                        />
                                        {showCountrySuggestions && (
                                            <div className="country-suggestions">
                                                {COUNTRIES.filter(c => c.toLowerCase().startsWith(country.toLowerCase())).slice(0, 5).map(c => (
                                                    <div key={c} className="suggestion-item" onClick={() => selectCountry(c)}>
                                                        {c}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : <span className="section-value">{country || '-'}</span>}
                            </div>
                            <div className="custom-section-item">
                                <span className="section-label">Company:</span>
                                {isEditing ? <input className="tui-input-sm" style={{ width: '60%' }} value={company} onChange={e => setCompany(e.target.value)} placeholder="Enter Company" /> : <span className="section-value">{company || '-'}</span>}
                            </div>

                            {customSections.map(section => (
                                <div key={section.id} className="custom-section-item">
                                    <span className="section-label">{section.label}:</span>
                                    {isEditing ? (
                                        <input
                                            className="tui-input-sm"
                                            style={{ width: '60%' }}
                                            value={section.value}
                                            onChange={(e) => updateSection(section.id, e.target.value)}
                                            placeholder="Enter Value"
                                        />
                                    ) : (
                                        <a href={section.value.startsWith('http') ? section.value : `https://${section.value}`} target="_blank" rel="noopener noreferrer" className="section-value link">
                                            {section.value}
                                        </a>
                                    )}
                                    {isEditing && (
                                        <button className="tui-btn-xs delete-btn" onClick={() => deleteSection(section.id)}>X</button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {isEditing && isMyProfile && (
                            <div className="add-section-form">
                                <input
                                    type="text"
                                    className="tui-input-sm"
                                    placeholder="Label (e.g. Github)"
                                    value={newSection.label}
                                    onChange={e => setNewSection({ ...newSection, label: e.target.value })}
                                />
                                <input
                                    type="text"
                                    className="tui-input-sm"
                                    placeholder="Value"
                                    value={newSection.value}
                                    onChange={e => setNewSection({ ...newSection, value: e.target.value })}
                                />
                                <button className="tui-btn-sm" onClick={handleAddSection}>ADD</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Friends & Search */}
                <div className="profile-right">
                    <div className="tui-panel world-ranking">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>WORLD RANKING</h3>
                            {!showLeaderboard && (
                                <button className="tui-btn-sm" onClick={() => setShowLeaderboard(true)}>Load Leaderboard</button>
                            )}
                            {showLeaderboard && (
                                <button className="tui-btn-sm" onClick={() => setShowLeaderboard(false)}>Hide</button>
                            )}
                        </div>

                        {showLeaderboard && (
                            <div className="ranking-list" style={{ marginTop: '1rem' }}>
                                {rankings.length === 0 && <div className="empty-msg">No ranked players yet.</div>}
                                {rankings.map((r, i) => (
                                    <div key={i} className={`ranking-item ${i < 3 ? 'top' : ''} ${r.username === displayUsername ? 'user' : ''}`}>
                                        <span onClick={() => onNavigateToProfile(r.username)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                                            {i + 1}. {r.username}
                                        </span>
                                        <span>({r.score})</span>
                                    </div>
                                ))}
                                {hasMoreRankings && (
                                    <button className="tui-btn-sm tui-full-width" style={{ marginTop: 10 }} onClick={loadMoreRankings}>
                                        LOAD MORE
                                    </button>
                                )}
                            </div>
                        )}
                        {!showLeaderboard && (
                            <div className="ranking-item user-session" style={{ marginTop: '10px' }}>
                                Current User Score: {profileScore}
                            </div>
                        )}
                    </div>

                    <div className="tui-panel profile-friends">
                        <div className="friends-header">
                            <button className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>MY CONNECTIONS</button>
                            <button className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>SEARCH USERS</button>
                        </div>

                        {activeTab === 'friends' ? (
                            <ul className="friend-list">
                                {friends.length === 0 && <li className="empty-msg">No connections yet.</li>}
                                {friends.map(f => (
                                    <li key={f.id} className="friend-item">
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span className={`status-dot ${f.status === 'accepted' ? 'online' : 'away'}`}></span>
                                            <span
                                                style={{ cursor: 'pointer', fontWeight: 'bold' }}
                                                onClick={() => onNavigateToProfile(f.username)}
                                            >
                                                {f.username}
                                            </span>
                                            <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '5px' }}>({f.status})</span>
                                        </div>
                                        <div className="friend-actions">
                                            {f.status === 'pending' && (
                                                <button className="tui-btn-xs" style={{ marginRight: 5 }} onClick={() => acceptConnect(f.id)}>ACCEPT</button>
                                            )}
                                            <button className="tui-btn-xs danger" onClick={() => disconnectUser(f.id)}>DISCONNECT</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="user-search-section">
                                <form onSubmit={handleSearch} className="search-form">
                                    <input
                                        type="text"
                                        className="tui-input"
                                        placeholder="Search username..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                    <button className="tui-btn-sm">SEARCH</button>
                                </form>
                                <ul className="friend-list">
                                    {searchResults.map(u => {
                                        const friendship = friends.find(f => f.id === u.id);
                                        return (
                                            <li key={u.id} className="friend-item">
                                                <span
                                                    style={{ cursor: 'pointer', fontWeight: 'bold' }}
                                                    onClick={() => onNavigateToProfile(u.username)}
                                                >
                                                    {u.username}
                                                </span>
                                                <div className="friend-actions">
                                                    {friendship ? (
                                                        <span className="status-label">{friendship.status}</span>
                                                    ) : (
                                                        <button className="tui-btn-xs" onClick={() => sendConnect(u.id)}>CONNECT</button>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
