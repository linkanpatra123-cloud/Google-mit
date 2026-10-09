export default function PeoplePanel({ people }) {
  return (
    <div className="pane">
      <ul className="people">
        {people.map((p) => (
          <li key={p.id}>
            <div className="pic">{(p.name || '?').trim().charAt(0).toUpperCase()}</div>
            <div className="who">{p.name}{p.isMe ? ' (You)' : ''}</div>
            <div className="st">{p.mic ? '🎤' : '🔇'}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
