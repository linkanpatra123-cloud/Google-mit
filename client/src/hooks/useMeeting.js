import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };


export default function useMeeting({ roomId, name, media, onNotice }) {
  const [peers, setPeers] = useState({}); 
  const [messages, setMessages] = useState([]);
  const [selfId, setSelfId] = useState(null);
  const [status, setStatus] = useState('connecting'); 
  const [sharing, setSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);

  const socketRef = useRef(null);
  const pcsRef = useRef({});
  const pendingRef = useRef({}); 
  const remoteStreamsRef = useRef({});
  const screenRef = useRef(null);
  const sharingRef = useRef(false);

 
  const peersRef = useRef(peers);
  peersRef.current = peers;
  const localRef = useRef(media.stream);
  localRef.current = media.stream;
  const stateRef = useRef({ mic: media.micOn, cam: media.camOn });
  stateRef.current = { mic: media.micOn, cam: media.camOn || sharing };
  const noticeRef = useRef(onNotice);
  noticeRef.current = onNotice;

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    const addMessage = (m) => setMessages((prev) => [...prev, m]);
    const patchPeer = (id, patch) =>
      setPeers((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));

    const createPeer = (id, asCaller = false) => {
      if (pcsRef.current[id]) return pcsRef.current[id];
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcsRef.current[id] = pc;
      pendingRef.current[id] = [];

      const local = localRef.current;
      const audio = local.getAudioTracks()[0];
      const video =
        sharingRef.current && screenRef.current
          ? screenRef.current.getVideoTracks()[0]
          : local.getVideoTracks()[0];

      
      if (audio) pc.addTrack(audio, local);
      else if (asCaller) pc.addTransceiver('audio', { direction: 'sendrecv' });
      if (video) pc.addTrack(video, local);
      else if (asCaller) pc.addTransceiver('video', { direction: 'sendrecv' });

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('signal', { to: id, data: { candidate: e.candidate } });
      };

     
      pc.ontrack = (e) => {
        if (!pcsRef.current[id]) return;
        let stream = remoteStreamsRef.current[id];
        if (!stream) {
          stream = new MediaStream();
          remoteStreamsRef.current[id] = stream;
          patchPeer(id, { stream });
        }
        if (!stream.getTracks().includes(e.track)) stream.addTrack(e.track);
      };
      return pc;
    };

    const callPeer = async (id) => {
      const pc = createPeer(id, true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('signal', { to: id, data: { sdp: pc.localDescription } });
    };

    const flushPending = async (id, pc) => {
      const queue = pendingRef.current[id] || [];
      while (queue.length) {
        try { await pc.addIceCandidate(queue.shift()); } catch (_) { /* ignore */ }
      }
    };

    const onSignal = async ({ from, data }) => {
      try {
        if (data.sdp) {
          const pc = createPeer(from);
          await pc.setRemoteDescription(data.sdp);
          await flushPending(from, pc);
          if (data.sdp.type === 'offer') {
            
            pc.getTransceivers().forEach((t) => { if (t.direction === 'recvonly') t.direction = 'sendrecv'; });
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('signal', { to: from, data: { sdp: pc.localDescription } });
          }
        } else if (data.candidate) {
          const pc = pcsRef.current[from];
          if (!pc) return;
          if (pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => {});
          else pendingRef.current[from].push(data.candidate);
        }
      } catch (err) {
        console.error('signal error', err);
      }
    };

    socket.on('connect', () => {
      setSelfId(socket.id);
      setStatus('connected');
      socket.emit('join-room', { roomId, name, mic: stateRef.current.mic, cam: stateRef.current.cam });
    });

    socket.on('room-full', () => setStatus('full'));
    socket.on('disconnect', () => {
      setStatus('disconnected');
      if (noticeRef.current) noticeRef.current('Connection lost. Reload the page to rejoin.');
    });

    
    socket.on('existing-users', (users) => {
      setPeers((prev) => {
        const next = { ...prev };
        users.forEach((u) => { next[u.id] = { name: u.name, mic: u.mic, cam: u.cam, stream: null }; });
        return next;
      });
      users.forEach((u) => callPeer(u.id).catch(console.error));
      addMessage({ system: true, text: users.length ? `You joined with ${users.length} other(s)` : 'You are the first one here' });
    });

    socket.on('user-joined', (u) => {
      patchPeer(u.id, { name: u.name, mic: u.mic, cam: u.cam, stream: null });
      addMessage({ system: true, text: `${u.name} joined` });
      if (noticeRef.current) noticeRef.current(`${u.name} joined`);
    });

    socket.on('signal', onSignal);

    socket.on('user-left', ({ id }) => {
      const who = (peersRef.current[id] && peersRef.current[id].name) || 'A participant';
      if (pcsRef.current[id]) { pcsRef.current[id].close(); delete pcsRef.current[id]; }
      delete pendingRef.current[id];
      delete remoteStreamsRef.current[id];
      setPeers((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      addMessage({ system: true, text: `${who} left` });
      if (noticeRef.current) noticeRef.current(`${who} left the meeting`);
    });

    socket.on('media-state', ({ id, mic, cam }) => patchPeer(id, { mic, cam }));
    socket.on('chat', (msg) => addMessage(msg));

    return () => {
      Object.values(pcsRef.current).forEach((pc) => pc.close());
      pcsRef.current = {};
      remoteStreamsRef.current = {};
      if (screenRef.current) screenRef.current.getTracks().forEach((t) => t.stop());
      socket.disconnect();
    };
  }, [roomId, name]);

  useEffect(() => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit('media-state', { mic: media.micOn, cam: media.camOn || sharing });
    }
  }, [media.micOn, media.camOn, sharing]);

  const replaceTrack = (kind, track) => {
    Object.values(pcsRef.current).forEach((pc) => {
      const t = pc.getTransceivers().find((x) => x.receiver.track && x.receiver.track.kind === kind);
      if (t) t.sender.replaceTrack(track).catch(() => {});
    });
  };

  useEffect(() => {
    replaceTrack('audio', media.stream.getAudioTracks()[0] || null);
    if (!sharingRef.current) replaceTrack('video', media.stream.getVideoTracks()[0] || null);

  }, [media.stream]);

  const stopShare = useCallback(() => {
    if (!sharingRef.current) return;
    sharingRef.current = false;
    if (screenRef.current) screenRef.current.getTracks().forEach((t) => t.stop());
    screenRef.current = null;
    replaceTrack('video', localRef.current.getVideoTracks()[0] || null);
    setScreenStream(null);
    setSharing(false);

  }, []);

  const startShare = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      if (noticeRef.current) noticeRef.current('Screen sharing is not supported in this browser');
      return;
    }
    let display;
    try {
      display = await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch (_) {
      return; 
    }
    const track = display.getVideoTracks()[0];
    track.onended = stopShare; 
    screenRef.current = display;
    sharingRef.current = true;
    replaceTrack('video', track);
    setScreenStream(display);
    setSharing(true);
    if (noticeRef.current) noticeRef.current('You are presenting your screen');
    
  }, [stopShare]);

 
  const sendChat = useCallback((text) => {
    const t = text.trim();
    if (t && socketRef.current) socketRef.current.emit('chat', t);
  }, []);

  return { selfId, peers, messages, status, sharing, screenStream, startShare, stopShare, sendChat };
}
