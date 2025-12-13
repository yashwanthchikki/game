# CodePixel Arena

**CodePixel Arena** is a strategic, turn-based multiplayer coding game where players fight by writing Python code. Players program their character's actions (Attack, Defend, Run, etc.) and execute them in real-time battles against opponents.

The game combines tactical decision-making with coding skills. You write a strategy in Python, push it to the server, and the game engine executes your logic against your opponent's.

![Gameplay UI](main.png)

## 🎮 Game Overview

The arena is a 1D grid with 6 zones (Positions 0-5).
*   **Player 1** starts at Position 0 (Left).
*   **Player 2** starts at Position 5 (Right).
*   **Zones:** The arena is divided into three groups (A, B, C). Players can move between these zones.

### Core Mechanics
*   **Turn-Based w/ Real-Time Execution:** You submit code, but the match runs in real-time ticks.
*   **Resources:**
    *   **HP (Health):** Reach 0 and you lose the round.
    *   **Mana:** Consumed by powerful attacks.
    *   **Ki:** Regenerates over time (every 10 actions). Used for movement and special attacks.
*   **Actions:**
    *   `attack1`: Basic melee attack (Low cost, moderate damage).
    *   `attack2`: Ranged attack (Mana cost).
    *   `attack3`: Special attack (Ki cost).
    *   `run`: Move forward (Costs Ki).
    *   `runopp`: Move backward (Costs Ki).
    *   `runattack`: Move forward and attack (High Ki cost).
    *   `push`: Push opponent back if in the same zone.
    *   `defend`: Reduce incoming damage.
    *   `idle`: Do nothing (Regenerate resources naturally).
*   **Cards:** Each player has consumable cards (HP/Mana potions) usable once per match.

## 🛠️ Technology Stack

This is a Full-Stack application dockerized for easy deployment.

*   **Frontend:** React, Vite, Socket.IO Client
*   **Backend:** Node.js, Express, Socket.IO Resource
*   **Game Engine:** Custom Node.js logic + Python Bridge (executes user Python code securely)
*   **Database:** SQLite (persists users, friends, profiles, rankings)
*   **Runtime:** Docker (Multi-stage build)

## 🚀 Getting Started

### Prerequisites
*   Docker Desktop installed
*   Git

### Installation (Docker)
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yashwanthchikki/game.git
    cd game
    ```

2.  **Build the Docker Image:**
    ```bash
    docker build -t codepixel-arena .
    ```

3.  **Run the Container:**
    ```bash
    docker run -p 5001:5001 codepixel-arena
    ```

4.  **Play:** Open your browser and navigate to `http://localhost:5001`.

### Manual Setup (Dev)
If you want to run it without Docker for development:

1.  **Frontend:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

2.  **Backend:**
    ```bash
    cd backend
    npm install
    node server.js
    ```

## 📝 How to Play
1.  **Register/Login:** Create an account to track your stats.
2.  **Create Room:** Host a private game (share the Room ID/Password) or a Public game.
3.  **Write Code:** Use the in-game IDE to define your strategy.
    *   Example: `if p.hp < 30: p.use_card_big_hp()`
4.  **Push Code:** Send your strategy to the server.
5.  **Watch the Battle:** The server executes your Python code each turn and visualizes the result!

## 🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License
[MIT](https://choosealicense.com/licenses/mit/)
