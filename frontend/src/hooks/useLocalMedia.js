import { useCallback, useEffect, useRef, useState } from 'react';

const describe = (err) => {
  switch (err && err.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera/microphone permission is blocked. Click the camera icon in the address bar, choose "Allow", then press Retry.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera or microphone was found on this device.';
    case 'NotReadableError':
    case 'AbortError':
      return 'Camera/microphone is being used by another app or browser. Close it, then press Retry.';
    default:
      return `Could not access camera/microphone (${(err && err.name) || 'unknown error'}). Press Retry.`;
  }
};

export default function useLocalMedia() {
  const [stream, setStream] = useState(() => new MediaStream());
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const streamRef = useRef(stream);
  const requestRef = useRef(0); 
  const aliveRef = useRef(true);

  const acquire = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera/microphone need a secure page: open the app on https:// or http://localhost (not an IP address). You can still join and watch/chat.');
      setLoading(false);
      return;
    }

    const tracks = [];
    let firstError = null;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      tracks.push(...s.getTracks());
    } catch (err) {
      firstError = err;
      for (const kind of ['audio', 'video']) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ [kind]: true });
          tracks.push(...s.getTracks());
        } catch (_) { /* keep the first error for the message */ }
      }
    }

    if (request !== requestRef.current || !aliveRef.current) {
      tracks.forEach((t) => t.stop());
      return;
    }

    streamRef.current.getTracks().forEach((t) => t.stop()); 
    const next = new MediaStream(tracks);
    streamRef.current = next;
    setStream(next);
    setMicOn(next.getAudioTracks().length > 0);
    setCamOn(next.getVideoTracks().length > 0);

    const missing = next.getAudioTracks().length === 0 || next.getVideoTracks().length === 0;
    setError(missing && firstError ? describe(firstError) : '');
    setLoading(false);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    acquire();
    return () => {
      aliveRef.current = false;
      requestRef.current += 1;
      streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [acquire]);

  const hasAudio = stream.getAudioTracks().length > 0;
  const hasVideo = stream.getVideoTracks().length > 0;

  const toggleMic = useCallback(() => {
    const tracks = streamRef.current.getAudioTracks();
    if (!tracks.length) { acquire(); return; } 
    const next = !tracks[0].enabled;
    tracks.forEach((t) => (t.enabled = next));
    setMicOn(next);
  }, [acquire]);

  const toggleCam = useCallback(() => {
    const tracks = streamRef.current.getVideoTracks();
    if (!tracks.length) { acquire(); return; }
    const next = !tracks[0].enabled;
    tracks.forEach((t) => (t.enabled = next));
    setCamOn(next);
  }, [acquire]);

  const stop = useCallback(() => {
    requestRef.current += 1;
    streamRef.current.getTracks().forEach((t) => t.stop());
  }, []);

  return { stream, micOn, camOn, hasAudio, hasVideo, error, loading, retry: acquire, toggleMic, toggleCam, stop };
}
