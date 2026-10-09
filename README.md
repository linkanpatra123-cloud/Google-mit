# Meetly (React) - Google Meet-style Video Meeting App

React.js (Vite) client + Node/Express + Socket.IO signaling server + WebRTC (peer-to-peer video/audio).

## Run kaise karein

Node 18+ chahiye.

```bash
cd meetly-react
npm run install:all        # server + client dono ki dependencies

# Option A - development (2 terminals)
npm run dev:server         # http://localhost:3000  (signaling server)
npm run dev:client         # http://localhost:5173  (React app, hot reload)

# Option B - production (1 server)
npm run build              # client/dist banata hai
npm start                  # http://localhost:3000 par poora app
```

Test karne ke liye 2 tabs me same meeting code se join karo.
Dusre device se kholne ke liye HTTPS chahiye (camera/mic sirf `localhost` ya `https` par milta hai), jaise `ngrok http 5173`.

## Features

- Lobby: naam, meeting code, "New meeting" (random code), camera/mic preview
- Multi-party video call (max 6 log), auto grid
- Mic / camera toggle (camera off par avatar), screen share, live chat, people list, meeting link copy
- Shortcuts: `M` = mic, `V` = camera
- Responsive layout

## React structure

```
client/src/
├── main.jsx                 # React entry
├── App.jsx                  # Lobby <-> Meeting switch
├── hooks/
│   ├── useLocalMedia.js     # camera/mic access, mute & camera toggle
│   └── useMeeting.js        # socket + WebRTC peers + chat + screen share
├── components/
│   ├── Lobby.jsx            # join screen + preview
│   ├── Meeting.jsx          # grid, bottom bar, side panel, toasts
│   ├── VideoTile.jsx        # ek participant ka video tile
│   ├── ChatPanel.jsx
│   └── PeoplePanel.jsx
└── styles.css
server/server.js             # rooms, signaling relay, chat
```

## Kaise kaam karta hai (step by step)

1. `App` pehle `useLocalMedia` se camera/mic leta hai. Lobby me naam + meeting code daalke "Join now" dabate hi `Meeting` screen khulti hai.
2. `Meeting` me `useMeeting` socket connect karta hai aur `join-room` bhejta hai.
3. Server naye user ko room ke existing users ki list deta hai (`existing-users`); baaki sabko `user-joined` milta hai.
4. Naya user har existing user ko WebRTC **offer** bhejta hai. Server sirf offer/answer/ICE candidates ko sahi banday tak relay karta hai (`signal` event). Video/audio server se nahi guzarta.
5. Har peer ke liye `RTCPeerConnection` banta hai (mesh). Remote stream aate hi `peers` state update hoti hai aur `VideoTile` use `<video>` me chala deta hai.
6. Mic/camera toggle `track.enabled` se hota hai; state `media-state` event se sabko pahunchti hai.
7. Screen share: `getDisplayMedia()` ka track `replaceTrack()` se camera track ki jagah chala jaata hai.
8. Chat: `chat` event poore room me broadcast hota hai; React text ko plain text render karta hai (XSS safe).
9. Leave par peer connections band, tracks stop, aur server baakiyon ko `user-left` bhejta hai.

## Limitations

- Mesh WebRTC hai, isliye ~6 users tak theek (zyada ke liye SFU jaise LiveKit/mediasoup).
- Sirf STUN hai; strict networks ke liye TURN add karna padega (`RTC_CONFIG` in `useMeeting.js`).
- Rooms memory me hain (server restart par reset), login/database nahi.
- Agar kisi ke paas camera nahi hai to wo screen share nahi kar sakta (dusron ko dikhega nahi).
