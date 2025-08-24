import { WebSocketServer, WebSocket } from 'ws';
const wss = new WebSocketServer({
    port: 8080
});
let socketArray = [];
let rooms = {};
/*
    {"1234", socket(websocket)}
    {"1234", socket(websocket)}
*/
function handleUserDisconnection(socket, reason = 'close') {
    const userIndex = socketArray.findIndex((u) => u.socketId === socket);
    if (userIndex !== -1) {
        const user = socketArray[userIndex];
        const roomId = user?.roomId;
        const username = user?.username;
        // Remove user from socketArray
        socketArray.splice(userIndex, 1);
        if (roomId && rooms[roomId]) {
            // Remove user from room
            rooms[roomId] = rooms[roomId].filter((s) => s !== socket);
            const userCount = rooms[roomId].length;
            if (userCount === 0) {
                // Delete empty room
                delete rooms[roomId];
            }
            else {
                // Broadcast updated user count to remaining users
                rooms[roomId].forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: "user-count-update",
                            payload: {
                                userCount,
                                roomId,
                                userLeft: username
                            }
                        }));
                    }
                });
            }
            return { roomId, username, userCount };
        }
        return null;
    }
}
wss.on("connection", (socket) => {
    console.log("Server started");
    socket.on("message", (e) => {
        const parsedMessage = JSON.parse(e.toString());
        //create room
        if (parsedMessage.type === "create-room") {
            const roomId = Math.random().toString(36).substring(2, 8); //generate unique ID
            rooms[roomId] = [];
            socket.send(JSON.stringify({
                type: "room-created",
                payload: { roomId },
            }));
        }
        //handle the joing request 
        if (parsedMessage.type === "join") //type-check for the message
         {
            const roomId = parsedMessage.payload.roomId;
            const username = parsedMessage.payload.username;
            if (rooms[roomId]) {
                rooms[roomId].push(socket);
                socketArray.push({
                    roomId,
                    socketId: socket,
                    username
                });
                const userCount = rooms[roomId].length;
                socket.send(JSON.stringify({
                    type: "joined-room",
                    payload: {
                        userCount,
                        userJoined: username
                    }
                }));
                rooms[roomId].forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: "user-count-update",
                            payload: {
                                userCount,
                                userJoined: username
                            }
                        }));
                    }
                });
            }
            else {
                socket.send(JSON.stringify({
                    type: "room-not-found",
                    payload: "Room not found"
                }));
            }
        }
        //handle the 'chat' message requests
        if (parsedMessage.type === "chat") //type-check for the message
         {
            //find the socket 
            const sender = socketArray.find((u) => u.socketId === socket);
            if (!sender) {
                return;
            }
            const roomId = sender.roomId;
            const message = parsedMessage.payload.message;
            const username = sender.username;
            if (rooms[roomId]) {
                rooms[roomId].forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: "chat",
                            payload: {
                                message,
                                username
                            }
                        }));
                    }
                });
            }
        }
        //disconnect manually
        if (parsedMessage.type === "disconnect") {
            const result = handleUserDisconnection(socket, 'manual');
            if (result) {
                // Send confirmation to the disconnecting user
                socket.send(JSON.stringify({
                    type: "disconnected",
                    payload: {
                        message: "Successfully left the room"
                    }
                }));
            }
        }
    });
    //automatic disconnect
    socket.on("close", () => {
        console.log("Client Disconnected");
        handleUserDisconnection(socket, 'close');
    });
});
//# sourceMappingURL=index.js.map