import { useEffect, useRef, useState } from 'react';

const randomCode = () => {
  const letters = 'abcdefghijkmnpqrstuvwxyz';
  const part = (n) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `${part(3)}-${part(4)}-${part(3)}`;
};

const readSavedName = () => {
  try { return localStorage.getItem('meetly-name') || ''; } catch (_) { return ''; }
};

export default function Lobby({ media, onJoin }) {
  const [name, setName] = useState(readSavedName);
  const [roomId, setRoomId] = useState(() => new URLSearchParams(location.search).get('room') || '');
  const [error, setError] = useState('');
  const previewRef = useRef(null);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.muted = true;
      previewRef.current.srcObject = media.stream;
    }
  }, [media.stream]);

  const join = () => {
    const cleanName = name.trim();
    const code = roomId.trim().toLowerCase().replace(/\s+/g, '-');
    if (!cleanName) return setError('Please enter your name.');
    if (!code) return setError('Enter a meeting code or click "New meeting".');
    try { localStorage.setItem('meetly-name', cleanName); } catch (_) { /* ignore */ }
    onJoin({ name: cleanName, roomId: code });
  };

  const onEnter = (e) => { if (e.key === 'Enter') join(); };

  return (
    <section className="lobby">
      <div className="preview-col">
        <div className="preview">
          <video ref={previewRef} autoPlay playsInline muted />
          {!media.camOn && <div className="preview-off">{media.loading ? 'Starting camera...' : 'Camera is off'}</div>}
          <div className="preview-controls">
            <button
              className={'round' + (media.micOn ? '' : ' off')}
              onClick={media.toggleMic}
              title={media.hasAudio ? 'Microphone' : 'Microphone unavailable - click to retry'}
            >
              {media.micOn ? '🎤' : '🔇'}
            </button>
            <button
              className={'round' + (media.camOn ? '' : ' off')}
              onClick={media.toggleCam}
              title={media.hasVideo ? 'Camera' : 'Camera unavailable - click to retry'}
            >
              {media.camOn ? '📷' : '🚫'}
            </button>
          </div>
        </div>
        {media.error && (
          <div className="note">
            <p>{media.error}</p>
            <button className="btn secondary" onClick={media.retry}>Retry camera / mic</button>
          </div>
        )}
      </div>

      <div className="join-col">
        <h1>Video meetings for everyone</h1>
        <p className="sub">Connect, collaborate and chat from anywhere with Meetly.</p>

        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            onKeyDown={onEnter}
            maxLength={40}
            placeholder="e.g. Rahul Sharma"
            autoComplete="name"
          />
        </label>

        <label className="field">
          <span>Meeting code</span>
          <input
            value={roomId}
            onChange={(e) => { setRoomId(e.target.value); setError(''); }}
            onKeyDown={onEnter}
            maxLength={40}
            placeholder="abc-defg-hij"
            autoComplete="off"
          />
        </label>

        <div className="actions">
          <button className="btn secondary" onClick={() => { setRoomId(randomCode()); setError(''); }}>
            New meeting
          </button>
          <button className="btn primary" onClick={join}>Join now</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}
