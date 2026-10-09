import { useEffect, useRef } from 'react';

export default function VideoTile({ name, stream, mic, cam, isMe = false, sharing = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = isMe; 
    if (el.srcObject !== (stream || null)) el.srcObject = stream || null;
    if (stream) el.play().catch(() => {}); 
  }, [stream, isMe]);

  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const className = ['tile', isMe && 'me', sharing && 'sharing', !cam && 'cam-off', !mic && 'mic-off']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <video ref={videoRef} autoPlay playsInline />
      <div className="avatar"><span>{initial}</span></div>
      <div className="label">
        <span className="mic-ind">🔇</span>
        <span className="nm">{name}{isMe ? ' (You)' : ''}</span>
      </div>
    </div>
  );
}
