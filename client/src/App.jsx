import { useState } from 'react';
import useLocalMedia from './hooks/useLocalMedia.js';
import Lobby from './components/Lobby.jsx';
import Meeting from './components/Meeting.jsx';

export default function App() {
  const media = useLocalMedia();
  const [session, setSession] = useState(null);

  const handleJoin = ({ name, roomId }) => {
    history.replaceState(null, '', '?room=' + encodeURIComponent(roomId));
    setSession({ name, roomId });
  };

  
  const handleLeave = () => {
    window.location.href = window.location.pathname;
  };

  return session ? (
    <Meeting name={session.name} roomId={session.roomId} media={media} onLeave={handleLeave} />
  ) : (
    <Lobby media={media} onJoin={handleJoin} />
  );
}
