const fs = require('fs');
const path = require('path');

class ThreeStateCounter {
    constructor(db) {
        this.db = db;
        this.counters = new Map(); // name -> { value, dirty, jump, flushEvery, opsSinceFlush }
        // Initialize Promise to ensure table exists before setup runs
        this.initPromise = new Promise((resolve, reject) => {
            this.db.run(`CREATE TABLE IF NOT EXISTS counters (
                name TEXT PRIMARY KEY,
                value INTEGER
            )`, (err) => {
                if (err) {
                    console.error("Failed to create counters table:", err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async setup(name, initial = 0, jump = 1, flushEvery = 10) {
        await this.initPromise; // Wait for table creation

        if (this.counters.has(name)) return this.getWrapper(name);

        // Load specific counter or all into memory?
        // For simplicity, load on setup.
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT value FROM counters WHERE name = ?`, [name], (err, row) => {
                if (err) {
                    console.error("Counter load error:", err);
                    // Fallback to initial
                    this.counters.set(name, {
                        value: initial,
                        dirty: true, // Needs save
                        jump,
                        flushEvery,
                        opsSinceFlush: 0
                    });
                } else {
                    this.counters.set(name, {
                        value: row ? row.value : initial,
                        dirty: !row, // If new, it's dirty
                        jump,
                        flushEvery,
                        opsSinceFlush: 0
                    });
                }
                resolve(this.getWrapper(name));
            });
        });
    }

    getWrapper(name) {
        const counter = this.counters.get(name);

        const wrapper = (delta) => {
            const increment = delta !== undefined ? delta : counter.jump;
            counter.value += increment;
            counter.dirty = true;
            counter.opsSinceFlush++;

            if (counter.opsSinceFlush >= counter.flushEvery) {
                this.flush(name);
            }
        };

        // Add properties to the function object
        Object.defineProperty(wrapper, 'value', {
            get: () => counter.value
        });

        wrapper.flush = () => this.flush(name);

        return wrapper;
    }

    flush(name) {
        const counter = this.counters.get(name);
        if (!counter || !counter.dirty) return;

        // Reset dirty before write to avoid loops (simple concurrency)
        counter.dirty = false;
        counter.opsSinceFlush = 0;

        this.db.run(`INSERT OR REPLACE INTO counters (name, value) VALUES (?, ?)`,
            [name, counter.value],
            (err) => {
                if (err) {
                    console.error(`Failed to flush counter ${name}:`, err);
                    counter.dirty = true; // Retry next time
                }
            }
        );
    }

    flushAll() {
        for (const name of this.counters.keys()) {
            this.flush(name);
        }
    }
}

module.exports = ThreeStateCounter;
