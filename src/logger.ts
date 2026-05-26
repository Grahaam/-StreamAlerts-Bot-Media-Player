import { Socket } from "socket.io-client";

// Forwards console logs to the server
export function setupConsoleLogging(socket: Socket) {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
        originalLog.apply(console, args);
        socket.emit("client_console_log", { level: "info", message: args.join(" ") });
    };

    console.error = (...args) => {
        originalError.apply(console, args);
        socket.emit("client_console_log", { level: "error", message: args.join(" ") });
    };
}
