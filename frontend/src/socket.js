import { io } from 'socket.io-client';

const URL = 'http://127.0.0.1:5001';

export const socket = io(URL, {
    autoConnect: false,
    reconnection: true,
});

export const connectSocket = (token) => {
    socket.auth = { token };
    socket.connect();
};
