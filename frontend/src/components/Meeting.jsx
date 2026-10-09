import { useCallback, useEffect, useRef, useState } from 'react';
import useMeeting from '../hooks/useMeeting.js';
import VideoTile from './VideoTile.jsx';
import ChatPanel from './ChatPanel.jsx';
import PeoplePanel from './PeoplePanel.jsx';

const clockNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function Meeting({ name, roomId, media, onLeave }) {
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }, []);

  const meeting = useMeeting({ roomId, name, media, onNotice: notify });
  const { selfId, peers, messages, status, sharing, screenStream, startShare, stopShare, sendChat } = meeting;

  const [panel, setPanel] = useState(null); 
  const [unread, setUnread] = useState(0);
  const [clock, setClock] = useState(clockNow);
  const seenRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => setClock(clockNow()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fresh = messages.slice(seenRef.current);
    seenRef.current = messages.length;
    if (panel !== 'chat') {
      setUnread((u) => u + fresh.filter((m) => !m.system && m.id !== selfId).length);
    }
  }, [messages, panel, selfId]);

  useEffect(() => {
    if (status === 'full') {
      alert('This meeting is full (max 6 participants).');
      leave();
    }
  }, [status]);

  useEffect(() => {
    const onKey = (e) => {
      if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === 'm' || e.key === 'M') media.toggleMic();
      if (e.key === 'v' || e.key === 'V') media.toggleCam();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [media.toggleMic, media.toggleCam]);

  const leave = () => {
    media.stop();
    onLeave();
  };

  const togglePanel = (tab) => {
    if (panel === tab) return setPanel(null);
    setPanel(tab);
    if (tab === 'chat') setUnread(0);
  };

  const copyLink = async () => {
    const link = `${location.origin}${location.pathname}?room=${encodeURIComponent(roomId)}`;
    try {
      await navigator.clipboard.writeText(link);
      notify('Meeting link copied');
    } catch (_) {
      window.prompt('Copy this meeting link:', link);
    }
  };

  const peerList = Object.entries(peers);
  const tileCount = Math.min(1 + peerList.length, 6);
  const people = [
    { id: 'me', name, mic: media.micOn, isMe: true },
    ...peerList.map(([id, p]) => ({ id, name: p.name, mic: p.mic !== false })),
  ];

  return (
    <section className="meeting">
      {media.error && (
        <div className="media-banner">
          <span>{media.error}</span>
          <button onClick={media.retry}>Retry</button>
        </div>
      )}
      <div className="stage">
        <div className="grid" data-count={tileCount}>
          <VideoTile
            name={name}
            isMe
            sharing={sharing}
            stream={sharing ? screenStream : media.stream}
            mic={media.micOn}
            cam={media.camOn || sharing}
          />
          {peerList.map(([id, p]) => (
            <VideoTile
              key={id}
              name={p.name}
              stream={p.stream}
              mic={p.mic !== false}
              cam={p.cam !== false}
            />
          ))}
        </div>

        {panel && (
          <aside className="side">
            <div className="side-head">
              <div className="tabs">
                <button className={'tab' + (panel === 'chat' ? ' active' : '')} onClick={() => { setPanel('chat'); setUnread(0); }}>
                  Chat{unread > 0 && <span className="badge">{unread}</span>}
                </button>
                <button className={'tab' + (panel === 'people' ? ' active' : '')} onClick={() => setPanel('people')}>
                  People <span className="count">{people.length}</span>
                </button>
              </div>
              <button className="x" onClick={() => setPanel(null)} title="Close">✕</button>
            </div>
            {panel === 'chat' ? (
              <ChatPanel messages={messages} selfId={selfId} onSend={sendChat} />
            ) : (
              <PeoplePanel people={people} />
            )}
          </aside>
        )}
      </div>

      <footer className="bar">
        <div className="bar-left">
          <span>{clock}</span>
          <span className="sep">|</span>
          <span className="code">{roomId}</span>
        </div>

        <div className="bar-center">
          <button
            className={'round' + (media.micOn ? '' : ' off')}
            onClick={media.toggleMic}
            title={media.hasAudio ? 'Microphone (M)' : 'Microphone unavailable - click to retry'}
          >
            {media.micOn ? '🎤' : '🔇'}
          </button>
          <button
            className={'round' + (media.camOn ? '' : ' off')}
            onClick={media.toggleCam}
            title={media.hasVideo ? 'Camera (V)' : 'Camera unavailable - click to retry'}
          >
            {media.camOn ? '📷' : '🚫'}
          </button>
          <button
            className={'round' + (sharing ? ' active' : '')}
            onClick={sharing ? stopShare : startShare}
            title={sharing ? 'Stop presenting' : 'Present screen'}
          >
            🖥️
          </button>
          <button className="round leave" onClick={leave} title="Leave call">📞</button>
        </div>

        <div className="bar-right">
          <button className="round ghost" onClick={copyLink} title="Copy meeting link">🔗</button>
          <button className={'round ghost' + (panel === 'people' ? ' active' : '')} onClick={() => togglePanel('people')} title="People">👥</button>
          <button className={'round ghost' + (panel === 'chat' ? ' active' : '')} onClick={() => togglePanel('chat')} title="Chat">
            💬{unread > 0 && panel !== 'chat' && <span className="dot" />}
          </button>
        </div>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </section>
  );
}
