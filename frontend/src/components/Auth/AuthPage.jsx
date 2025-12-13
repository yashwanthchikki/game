import React, { useState } from 'react';
import './AuthPage.css';

const AuthPage = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const endpoint = isLogin ? '/api/login' : '/api/register';
        try {
            const response = await fetch(`http://127.0.0.1:5001${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (response.ok) {
                onLogin(data.token, data.username);
            } else {
                setError(data.error || 'Authentication failed');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        }
    };

    return (
        <div className="auth-container">
            <div className="tui-panel auth-panel">
                <h2 className="tui-heading">{isLogin ? 'SYSTEM LOGIN' : 'NEW USER REGISTRATION'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="tui-input-group">
                        <label>USERNAME</label>
                        <input
                            type="text"
                            className="tui-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="tui-input-group">
                        <label>PASSWORD</label>
                        <input
                            type="password"
                            className="tui-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <div className="tui-text-error">{error}</div>}
                    <button type="submit" className="tui-button">{isLogin ? 'ACCESS' : 'REGISTER'}</button>
                </form>
                <div className="auth-switch">
                    <span onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? 'Create Account' : 'Back to Login'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
