import React, { useState, useEffect } from 'react';
import './IDE.css';

const IDE = ({ onPushCode, onCompile, onViewOpponentCode, onViewOpponentStack }) => {
    const [stack, setStack] = useState(Array(10).fill({ name: '', condition: '' }));
    const [code, setCode] = useState(`import random

def my_strategy(p, **kwargs):
    # Example: Randomly choose 3 actions
    # This allows you to queue multiple moves in one turn
    options = [p.attack1, p.defend, p.run, p.idle]
    
    # Return a list of 3 actions
    return [random.choice(options)() for _ in range(3)]
`);
    const [isPushing, setIsPushing] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [versions, setVersions] = useState([{
        id: 1,
        code: `import random

def my_strategy(p, **kwargs):
    # Example: Randomly choose 3 actions
    # This allows you to queue multiple moves in one turn
    options = [p.attack1, p.defend, p.run, p.idle]
    
    # Return a list of 3 actions
    return [random.choice(options)() for _ in range(3)]
`,
        cooldownCode: `def cooldown_strategy(p, **kwargs):
    # This runs during the 3s push cooldown
    p.defend()
`,
        stack: Array(10).fill({ name: '', condition: '' }),
        timestamp: Date.now()
    }]);
    const [activeVersion, setActiveVersion] = useState(1);
    const [compileStatus, setCompileStatus] = useState(null); // null, 'success', 'error'

    const [activeTab, setActiveTab] = useState('cooldown'); // 'main' or 'cooldown'
    const [cooldownCode, setCooldownCode] = useState(`def cooldown_strategy(p, **kwargs):
    # This runs during the 3s push cooldown
    p.defend()
`);

    const handleStackChange = (index, field, value) => {
        const newStack = [...stack];
        newStack[index] = { ...newStack[index], [field]: value };
        setStack(newStack);
    };

    const handleCompile = async () => {
        setCompileStatus('checking');
        try {
            // Compile current tab's code
            const codeToCompile = activeTab === 'main' ? code : cooldownCode;
            if (onCompile) {
                const result = await onCompile(codeToCompile);
                if (result.success) {
                    setCompileStatus('success');
                    setTimeout(() => setCompileStatus(null), 2000);
                } else {
                    setCompileStatus('error');
                    alert(`Syntax Error: ${result.error}`);
                }
            } else {
                // Fallback mock
                setTimeout(() => setCompileStatus('success'), 500);
            }
        } catch (e) {
            setCompileStatus('error');
        }
    };

    const handlePush = () => {
        if (cooldown > 0) return;

        setIsPushing(true);
        setCooldown(3000);

        // Save version
        const newVersionId = versions.length + 1;
        const newVersion = {
            id: newVersionId,
            code,
            cooldownCode,
            stack: [...stack],
            timestamp: Date.now()
        };
        setVersions([newVersion, ...versions]);
        setActiveVersion(newVersionId);

        // Stack is already in correct format { condition, action }
        onPushCode(code, stack, cooldownCode);

        // Cooldown timer
        const startTime = Date.now();
        const duration = 3000;

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, duration - elapsed);
            setCooldown(remaining);

            if (remaining === 0) {
                clearInterval(interval);
                setIsPushing(false);
            }
        }, 100);
    };

    const loadVersion = (v) => {
        setCode(v.code);
        setCooldownCode(v.cooldownCode || `def cooldown_strategy(p, **kwargs):
    # This runs during the 3s push cooldown
    p.defend()
`);
        setStack(v.stack);
        setActiveVersion(v.id);
    };

    return (
        <div className="ide-container">
            <div className="ide-left-panel">
                <h3>VERSIONS</h3>
                <div className="version-list">
                    {versions.map(v => (
                        <div
                            key={v.id}
                            className={`version-item ${activeVersion === v.id ? 'active' : ''}`}
                            onClick={() => loadVersion(v)}
                        >
                            V{v.id}
                        </div>
                    ))}
                </div>
            </div>

            <div className="ide-main-panel">
                <div className="function-stack-panel">
                    <h3>FUNCTION STACK</h3>
                    <div className="stack-header">
                        <span>Function Names (will be called in order)</span>
                    </div>
                    <div className="stack-grid">
                        {stack.map((item, i) => (
                            <div key={i} className="stack-row-container">
                                <div className="stack-row">
                                    <span className="stack-index">{i + 1}.</span>
                                    <input
                                        type="text"
                                        className="tui-input stack-input-condition"
                                        placeholder="Condition (e.g. p.hp < 50)"
                                        value={item.condition || ''}
                                        onChange={(e) => handleStackChange(i, 'condition', e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        className="tui-input stack-input-function"
                                        placeholder={`Function ${i + 1}`}
                                        value={item.name || ''}
                                        onChange={(e) => handleStackChange(i, 'name', e.target.value)}
                                    />
                                </div>
                                <div className="stack-divider"></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="code-editor-panel">
                    <div className="editor-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'main' ? 'active' : ''}`}
                            onClick={() => setActiveTab('main')}
                        >
                            MAIN STRATEGY
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'cooldown' ? 'active' : ''}`}
                            onClick={() => setActiveTab('cooldown')}
                        >
                            COOLDOWN STRATEGY
                        </button>
                    </div>
                    <textarea
                        className="code-editor"
                        value={activeTab === 'main' ? code : cooldownCode}
                        onChange={(e) => activeTab === 'main' ? setCode(e.target.value) : setCooldownCode(e.target.value)}
                        spellCheck="false"
                        placeholder={activeTab === 'main' ? "Write your main strategy here..." : "Write your cooldown strategy here..."}
                    />
                    <div className="ide-actions">
                        <div className="ide-buttons-left">
                            <button className="tui-btn secondary" onClick={onViewOpponentCode}>
                                OPP CODE
                            </button>
                            <button className="tui-btn secondary" onClick={onViewOpponentStack}>
                                OPP STACK
                            </button>
                        </div>

                        <div className="cooldown-container">
                            {cooldown > 0 && (
                                <div className="cooldown-bar-bg">
                                    <div
                                        className="cooldown-bar-fill"
                                        style={{ width: `${(cooldown / 3000) * 100}%` }}
                                    ></div>
                                </div>
                            )}
                        </div>

                        <div className="ide-buttons-right">
                            <button
                                className={`tui-btn ${compileStatus === 'success' ? 'success' : compileStatus === 'error' ? 'error' : ''}`}
                                onClick={handleCompile}
                            >
                                {compileStatus === 'checking' ? 'CHECKING...' : compileStatus === 'success' ? 'OK' : 'COMPILE'}
                            </button>
                            <button
                                className={`tui-btn ${isPushing ? 'disabled' : ''}`}
                                onClick={handlePush}
                                disabled={isPushing}
                            >
                                {isPushing ? `WAIT ${Math.ceil(cooldown / 1000)}s` : 'PUSH CODE'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IDE;
