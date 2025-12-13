import React, { useState, useEffect } from 'react';
import { socket } from '../../socket';
import { useToast } from '../../context/ToastContext';
import './GameLobby.css';

const GameLobby = ({ onJoinGame }) => {
    const [roomId, setRoomId] = useState('');
    const [password, setPassword] = useState('');
    const [createdRoom, setCreatedRoom] = useState(null);
    const [error, setError] = useState('');
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [isPublic, setIsPublic] = useState(false);
    const [publicRooms, setPublicRooms] = useState([]);
    const { showToast } = useToast();

    // Friend Filtering
    const [friends, setFriends] = useState([]);
    const [showFriendsOnly, setShowFriendsOnly] = useState(false);

    useEffect(() => {
        // Fetch friends for filtering
        const fetchFriends = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await fetch('http://127.0.0.1:5001/api/friends/list', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        // Store accepted friends usernames
                        setFriends(data.filter(f => f.status === 'accepted').map(f => f.username));
                    }
                } catch (e) {
                    console.error("Failed to fetch friends for lobby", e);
                }
            }
        };
        fetchFriends();

        const onConnect = () => {
            setIsConnected(true);
            showToast('Connected to server', 'success');
        };
        const onDisconnect = () => {
            setIsConnected(false);
            showToast('Disconnected from server', 'error');
        };

        // Poll for public rooms
        const fetchPublicRooms = () => {
            if (socket.connected) {
                socket.emit('get_public_rooms');
            }
        };
        const pollInterval = setInterval(fetchPublicRooms, 3000);

        const onPublicRoomsList = (rooms) => {
            setPublicRooms(rooms);
        };

        const onRoomCreated = (room) => {
            console.log('Room created event received:', room);
            setCreatedRoom(room);
            showToast('Room created successfully!', 'success');
        };

        const onGameStart = (data) => {
            console.log('Game start event received:', data);
            onJoinGame(data.roomId, 1);
        };

        const onJoinSuccess = (data) => {
            console.log('Join success event received:', data);
            onJoinGame(data.roomId, 2);
        };

        const onJoinError = (msg) => {
            console.error('Join error:', msg);
            setError(msg);
            showToast(msg, 'error');
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
            // Don't toast spam on connect error
        });
        socket.on('room_created', onRoomCreated);
        socket.on('game_start', onGameStart);
        socket.on('join_success', onJoinSuccess);
        socket.on('join_error', onJoinError);
        socket.on('public_rooms_list', onPublicRoomsList);

        fetchPublicRooms(); // Initial fetch

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error');
            socket.off('room_created', onRoomCreated);
            socket.off('game_start', onGameStart);
            socket.off('join_success', onJoinSuccess);
            socket.off('join_error', onJoinError);
            socket.off('public_rooms_list', onPublicRoomsList);
            clearInterval(pollInterval);
        };
    }, [onJoinGame, showToast]);

    const handleCreateRoom = () => {
        console.log('Emitting create_room...', { isPublic });
        socket.emit('create_room', { isPublic });
    };

    const handleJoinRoom = () => {
        if (!roomId || !password) {
            showToast('Please enter Room ID and Password', 'error');
            return;
        }
        console.log('Emitting join_room...');
        socket.emit('join_room', { roomId, password });
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        showToast(`${label} copied!`, 'success');
    };

    if (createdRoom) {
        return (
            <div className="lobby-container">
                <div className="tui-panel lobby-panel">
                    <h2>Waiting for Opponent...</h2>
                    <div className="room-info">
                        <p>
                            Room ID: <span className="highlight">{createdRoom.roomId}</span>
                            <button className="tui-btn-xs" style={{ marginLeft: '10px' }} onClick={() => copyToClipboard(createdRoom.roomId, 'Room ID')}>Copy</button>
                        </p>
                        <p>
                            Password: <span className="highlight">{createdRoom.password}</span>
                            <button className="tui-btn-xs" style={{ marginLeft: '10px' }} onClick={() => copyToClipboard(createdRoom.password, 'Password')}>Copy</button>
                        </p>
                    </div>
                    <p className="hint">Share these credentials with your friend.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="lobby-container">
            <div className="tui-panel lobby-panel">
                <h2>CodePixel Arena</h2>
                <div className="status-indicator" style={{ color: isConnected ? 'green' : 'red' }}>
                    {isConnected ? '● Connected' : '● Disconnected'}
                </div>
                <div className="lobby-actions">
                    <div className="action-group">
                        <h3>Create Game</h3>
                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                />
                                Public Room (Visible to all)
                            </label>
                        </div>
                        <button className="tui-btn" onClick={handleCreateRoom}>Create Room</button>
                    </div>

                    <div className="divider">OR</div>

                    <div className="action-group">
                        <h3>Join Game</h3>
                        <input
                            type="text"
                            className="tui-input"
                            placeholder="Room ID"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                        />
                        <input
                            type="text"
                            className="tui-input"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button className="tui-btn" onClick={handleJoinRoom}>Join Room</button>
                    </div>
                </div>

                {publicRooms.length > 0 && (
                    <div className="public-rooms-section">
                        <div className="rooms-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Public Rooms</h3>
                            <label className="checkbox-label" style={{ fontSize: '0.9rem' }}>
                                <input
                                    type="checkbox"
                                    checked={showFriendsOnly}
                                    onChange={(e) => setShowFriendsOnly(e.target.checked)}
                                />
                                Friends Only
                            </label>
                        </div>
                        <div className="rooms-list">
                            {publicRooms
                                .filter(room => !showFriendsOnly || friends.includes(room.host))
                                .map(room => (
                                    <div key={room.roomId} className="room-item">
                                        <span>#{room.roomId} • {room.host} <span style={{ color: '#ffd700' }}>★{room.hostScore || 0}</span></span>
                                        <button
                                            className="tui-btn-sm"
                                            onClick={() => {
                                                setRoomId(room.roomId);
                                                setPassword(room.password);
                                            }}
                                        >Select</button>
                                    </div>
                                ))}
                            {publicRooms.filter(room => !showFriendsOnly || friends.includes(room.host)).length === 0 && (
                                <div className="empty-msg">No rooms found.</div>
                            )}
                        </div>
                    </div>
                )}
                {error && <div className="error-msg">{error}</div>}
            </div>
        </div>
    );
};

export default GameLobby;
