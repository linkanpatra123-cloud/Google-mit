import { useEffect, useRef, useState } from 'react';

const formatTime = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function ChatPanel({ messages, selfId, onSend }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="pane">
      <div className="messages" ref={listRef}>
        {messages.map((m, i) =>
          m.system ? (
            <div key={i} className="msg system">{m.text}</div>
          ) : (
            <div key={i} className="msg">
              <div className="meta">
                <b>{m.id === selfId ? 'You' : m.name}</b>
                <span>{formatTime(m.time)}</span>
              </div>
              <div className="text">{m.text}</div>
            </div>
          )
        )}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Send a message"
          autoComplete="off"
          autoFocus
        />
        <button className="send" title="Send">➤</button>
      </form>
    </div>
  );
}
