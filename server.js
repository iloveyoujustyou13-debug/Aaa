const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 5000 });

let studioClient = null;
let activeCameras = {};

console.log("CBP WebRTC Signaling Core started on port 5000");

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        let data = JSON.parse(message);
        
        switch (data.type) {
            case 'register_studio':
                studioClient = ws;
                console.log("Studio Master Control Panel Connected.");
                break;
                
            case 'register_camera':
                ws.cameraId = data.cameraId;
                activeCameras[data.cameraId] = ws;
                console.log(`Camera registered: ${data.cameraId}`);
                break;
                
            case 'offer':
                if (studioClient) {
                    studioClient.send(JSON.stringify({ type: 'offer', cameraId: data.cameraId, offer: data.offer }));
                }
                break;
                
            case 'answer':
                if (activeCameras[data.targetId]) {
                    activeCameras[data.targetId].send(JSON.stringify({ type: 'answer', answer: data.answer }));
                }
                break;
                
            case 'ice-candidate':
                if (data.targetId && activeCameras[data.targetId]) {
                    activeCameras[data.targetId].send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
                } else if (studioClient) {
                    studioClient.send(JSON.stringify({ type: 'ice-candidate', cameraId: ws.cameraId, candidate: data.candidate }));
                }
                break;
        }
    });

    ws.on('close', () => {
        if (ws.cameraId && activeCameras[ws.cameraId]) {
            delete activeCameras[ws.cameraId];
            console.log(`Camera disconnected: ${ws.cameraId}`);
            if (studioClient) {
                studioClient.send(JSON.stringify({ type: 'disconnect', cameraId: ws.cameraId }));
            }
        }
    });
});
