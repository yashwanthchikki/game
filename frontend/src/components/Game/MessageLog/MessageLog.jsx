import React, { useEffect, useRef } from 'react';
import './MessageLog.css';

const MessageLog = ({ logs }) => {
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="message-log-container">
            <div className="log-header">
                <div className="col-header">P1 SENT</div>
                <div className="col-header">P2 SENT</div>
                <div className="col-header">P1 RESULT</div>
                <div className="col-header">P2 RESULT</div>
            </div>
            <div className="log-content">
                {logs.map((log, i) => (
                    <div key={i} className="log-row">
                        <div className="log-cell p1-sent">{log.p1Intended}</div>
                        <div className="log-cell p2-sent">{log.p2Intended}</div>
                        <div className="log-cell p1-res">{log.p1}</div>
                        <div className="log-cell p2-res">{log.p2}</div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
};

export default MessageLog;
