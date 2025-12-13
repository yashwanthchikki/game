import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import GameLobby from './components/Lobby/GameLobby';
import GameContainer from './components/Game/GameContainer';
import ProfilePage from './components/Profile/ProfilePage';
import SettingsPage from './components/Settings/SettingsPage';
import AuthPage from './components/Auth/AuthPage';
import ErrorBoundary from './components/ErrorBoundary';
import { connectSocket, socket } from './socket';
import './styles/tui-theme.css';
import './components/Layout/Layout.css';
import { useToast } from './context/ToastContext';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [username, setUsername] = useState(localStorage.getItem('username'));
    const [view, setView] = useState('game');
    const [gameId, setGameId] = useState(null);
    const [playerId, setPlayerId] = useState(null);
    const [sessionScore, setSessionScore] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [profileTarget, setProfileTarget] = useState(null); // null means "me"
    const { showToast } = useToast();

    useEffect(() => {
        if (token) {
            connectSocket(token);
        }

        const onConnectError = (err) => {
            console.error('Socket connection error:', err.message);
            if (err.message.includes('Authentication error') || err.message.includes('Invalid token')) {
                handleLogout();
            }
        };

        const onGameOver = (data) => {
            if (playerId && data.winner === playerId) {
                setSessionScore(prev => prev + 10);
                showToast("Victory! +10 Points (Session)", "success");
            }
        };

        socket.on('connect_error', onConnectError);
        socket.on('game_over', onGameOver);

        return () => {
            socket.off('connect_error', onConnectError);
            socket.off('game_over', onGameOver);
        };
    }, [token, playerId, showToast]);

    const handleLogin = (newToken, newUsername) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('username', newUsername);
        setToken(newToken);
        setUsername(newUsername);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setToken(null);
        setUsername(null);
        socket.disconnect();
    };

    const handleJoinGame = (id, pid) => {
        setGameId(id);
        setPlayerId(pid);
        setView('arena');
    };

    const handleNavigate = (newView, target = null) => {
        if (newView === 'profile') {
            setProfileTarget(target); // target is username or null (me)
        }
        setView(newView);
    };

    const renderView = () => {
        switch (view) {
            case 'profile':
                return <ProfilePage
                    username={username}
                    sessionScore={sessionScore}
                    targetUsername={profileTarget}
                    onNavigateToProfile={(u) => handleNavigate('profile', u)}
                />;
            case 'game':
                return <GameLobby onJoinGame={handleJoinGame} />;
            case 'arena':
                return (
                    <ErrorBoundary>
                        <GameContainer gameId={gameId} playerId={playerId} />
                    </ErrorBoundary>
                );
            case 'settings':
                return (
                    <SettingsPage username={username} onLogout={handleLogout} />
                );
            default:
                return <div>Select a view</div>;
        }
    };

    if (!token) {
        return <AuthPage onLogin={handleLogin} />;
    }

    return (
        <div className="tui-container">
            <Sidebar onNavigate={(v) => handleNavigate(v, null)} isOpen={isSidebarOpen} onToggle={setIsSidebarOpen} />
            <main className="tui-main" style={{
                marginLeft: isSidebarOpen ? '200px' : '50px',
                transition: 'margin-left 0.3s'
            }}>
                {renderView()}
            </main>
        </div>
    );
}

export default App;
