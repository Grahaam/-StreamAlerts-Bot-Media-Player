import { io } from "socket.io-client";

export const socket = io(window.location.origin, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
});

let latency = 0;
export const getLatency = () => latency;

socket.on("pong", (timestamp: number) => {
    latency = Date.now() - timestamp;
});

// Ping server every 5s to keep connection alive
setInterval(() => {
    if (socket.connected) {
        socket.emit("ping", Date.now());
    }
}, 5000);
