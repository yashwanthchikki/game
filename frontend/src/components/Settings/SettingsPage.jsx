import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import './SettingsPage.css';

const SettingsPage = ({ username, onLogout }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { showToast } = useToast();

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            showToast("New passwords do not match", "error");
            return;
        }

        if (newPassword.length < 4) {
            showToast("Password must be at least 4 characters", "error");
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://127.0.0.1:5001/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });

            const data = await res.json();

            if (res.ok) {
                showToast("Password updated successfully", "success");
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                showToast(data.error || "Failed to update password", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Network error", "error");
        }
    };

    return (
        <div className="settings-container">
            <h1 className="tui-text-primary">SETTINGS</h1>

            <div className="tui-panel settings-section">
                <h3>ACCOUNT INFO</h3>
                <p>Logged in as: <span className="highlight">{username}</span></p>
            </div>

            <div className="tui-panel settings-section">
                <h3>CHANGE PASSWORD</h3>
                <form onSubmit={handleChangePassword}>
                    <div className="form-group">
                        <label>Current Password</label>
                        <input
                            type="password"
                            className="tui-input"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            className="tui-input"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            className="tui-input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="tui-btn tui-full-width">UPDATE PASSWORD</button>
                </form>
            </div>

            <button onClick={onLogout} className="tui-btn logout-btn">
                LOGOUT
            </button>
        </div>
    );
};

export default SettingsPage;
