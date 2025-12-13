const { PythonShell } = require('python-shell');
const fs = require('fs');
const path = require('path');

class PythonBridge {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp_execution');
        try {
            if (!fs.existsSync(this.tempDir)) {
                fs.mkdirSync(this.tempDir, { recursive: true });
            }
        } catch (e) {
            console.error("Failed to create temp dir:", e);
        }
    }

    async execute(userCode, functionStack, args) {
        return new Promise((resolve, reject) => {
            const timestamp = Date.now();
            const uniqueId = Math.random().toString(36).substring(7);
            const runId = `${timestamp}_${uniqueId}`;

            // File paths
            const playerClassPath = path.join(this.tempDir, `player_class_${runId}.py`);
            const userScriptPath = path.join(this.tempDir, `user_script_${runId}.py`);
            const mainScriptPath = path.join(this.tempDir, `main_${runId}.py`);

            // 1. Create player_class.py
            // 1. Create player_class.py (Copy from persistent source)
            const sourcePlayerClass = path.join(__dirname, 'player_class.py');
            let playerClassCode = '';
            try {
                playerClassCode = fs.readFileSync(sourcePlayerClass, 'utf8');
            } catch (err) {
                console.error("Error reading player_class.py:", err);
                // Fallback minimal class if file read fails
                playerClassCode = `class Player:
    def __init__(self):
        self.messages = []
    def use_card_big_hp(self):
        self.messages.append("use_card_big_hp")
        self.messages.append("idle")
    def use_card_big_mana(self):
        self.messages.append("use_card_big_mana")
        self.messages.append("idle")
    def idle(self): self.messages.append("idle")`;
            }
            fs.writeFileSync(playerClassPath, playerClassCode);

            // 2. Create user_script.py
            const userScriptContent = `
from player_class_${runId} import Player

${userCode}
                `;
            fs.writeFileSync(userScriptPath, userScriptContent);

            const stackArray = Array.isArray(functionStack) ? functionStack : [];
            const mainScriptCode = `
import sys
import json
import user_script_${runId} as user_script
from player_class_${runId} import Player

if __name__ == "__main__":
    try:
        args = ${JSON.stringify(args)}
        # stackArray is now a list of objects: [{"name": "func1", "condition": "p.hp < 50"}, ...]
        stack_data = ${JSON.stringify(stackArray)}
        
        selected_action = ['idle', 'idle', 'idle']
        
        # Instantiate Player to capture messages
        p = Player()
        
        # Iterate through stack to find the FIRST matching condition
        for item in stack_data:
            func_name = item.get('name', '').strip()
            condition_str = item.get('condition', '').strip()
            
            if not func_name:
                continue

            # Check Condition
            condition_met = True
            if condition_str:
                try:
                    # MOCKING STATS FOR CONDITION EVAL
                    class MockPlayer:
                        def __init__(self, hp, mana, ki, pos):
                            self.hp = hp
                            self.mana = mana
                            self.ki = ki
                            self.pos = pos

                    # Extract stats from args
                    p1 = MockPlayer(
                        args.get('p1_hp', 100),
                        args.get('p1_mana', 100),
                        args.get('p1_ki', 0),
                        args.get('p1_pos', 0)
                    )
                    p2 = MockPlayer(
                        args.get('p2_hp', 100),
                        args.get('p2_mana', 100),
                        args.get('p2_ki', 0),
                        args.get('p2_pos', 0)
                    )

                    # Determine 'p' (self) based on my_pos
                    is_p1 = (args.get('my_pos') == args.get('p1_pos'))
                    p.hp = p1.hp if is_p1 else p2.hp
                    p.mana = p1.mana if is_p1 else p2.mana
                    p.ki = p1.ki if is_p1 else p2.ki
                    
                    # Evaluate condition with p, p1, p2, and args in scope
                    condition_met = eval(condition_str, {"p": p, "p1": p1, "p2": p2, "args": args})
                except Exception as e:
                    print(f"Error evaluating condition '{condition_str}': {e}", file=sys.stderr)
                    condition_met = False
            
            if condition_met:
                if hasattr(user_script, func_name):
                    func = getattr(user_script, func_name)
                    
                    # Reset messages
                    p.messages = [] 
                    
                    try:
                        func(p, **args)
                        result = p.messages
                        
                        if result:
                            # If we got actions, valid! Process and BREAK (First match only)
                            if len(result) > 3:
                                selected_action = ['idle', 'idle', 'idle']
                            else:
                                result.extend(['idle'] * (3 - len(result)))
                                selected_action = result[:3]
                            break
                        # If function executed but returned NO actions, do we fall through?
                        # "if condition then function". If function does nothing, that's still the chosen branch.
                        # So we generally break here unless we want "try next if this fails".
                        # Standard if/elif logic implies we stop at the first true condition.
                        break 
                        
                    except Exception as e:
                        print(f"Error calling {func_name}: {e}", file=sys.stderr)
                        # If error, break or continue? Usually break to avoid unpredictable behavior.
                        selected_action = ['idle', 'idle', 'idle']
                        break
        
        print(json.dumps({"status": "success", "action": selected_action}))
        
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
`;
            fs.writeFileSync(mainScriptPath, mainScriptCode);

            // Execute main.py
            PythonShell.run(mainScriptPath, { mode: 'text' }).then(messages => {
                // Cleanup
                try {
                    if (fs.existsSync(playerClassPath)) fs.unlinkSync(playerClassPath);
                    if (fs.existsSync(userScriptPath)) fs.unlinkSync(userScriptPath);
                    if (fs.existsSync(mainScriptPath)) fs.unlinkSync(mainScriptPath);
                } catch (e) { console.error("Cleanup error:", e); }

                try {
                    const lastMsg = messages[messages.length - 1];
                    const output = JSON.parse(lastMsg);
                    if (output.status === 'success') {
                        resolve(output.action);
                    } else {
                        console.error("Python Error:", output.message);
                        resolve(['idle']);
                    }
                } catch (e) {
                    console.error("Parse Error:", e);
                    resolve(['idle']);
                }
            }).catch(err => {
                console.error("Execution Error:", err);
                resolve(['idle']);
            });
        });
    }

    async checkSyntax(userCode) {
        return new Promise((resolve) => {
            const timestamp = Date.now();
            const uniqueId = Math.random().toString(36).substring(7);
            const runId = `${timestamp}_${uniqueId} `;
            const userScriptPath = path.join(this.tempDir, `check_${runId}.py`);

            // Write user code to file
            // We need to mock the Player class import so it doesn't fail on import
            const playerClassPath = path.join(this.tempDir, `player_class_${runId}.py`);
            const playerClassCode = `class Player: pass`;
            fs.writeFileSync(playerClassPath, playerClassCode);

            const userCodeWithImport = `from player_class_${runId} import Player\n${userCode} `;
            fs.writeFileSync(userScriptPath, userCodeWithImport);

            // Use py_compile to check syntax
            PythonShell.runString(`
                import py_compile
import sys
import json
try:
                py_compile.compile('${userScriptPath.replace(/\\/g, '\\\\')}', doraise = True)
                print(json.dumps({ "status": "success" }))
except Exception as e:
                print(json.dumps({ "status": "error", "message": str(e) }))
                    `, { mode: 'text' }).then(messages => {
                // Cleanup
                try {
                    if (fs.existsSync(playerClassPath)) fs.unlinkSync(playerClassPath);
                    if (fs.existsSync(userScriptPath)) fs.unlinkSync(userScriptPath);
                    // py_compile creates __pycache__, we might want to ignore or clean it
                } catch (e) { }

                try {
                    const output = JSON.parse(messages[messages.length - 1]);
                    resolve(output);
                } catch (e) {
                    resolve({ status: 'error', message: 'Unknown error' });
                }
            }).catch(err => {
                resolve({ status: 'error', message: err.message });
            });
        });
    }
}

module.exports = PythonBridge;
