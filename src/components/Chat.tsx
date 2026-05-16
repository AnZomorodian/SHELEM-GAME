import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';

interface ChatProps {
  messages: any[];
  playerName: string;
  onSendMessage: (text: string) => void;
}

export default function Chat({ messages, playerName, onSendMessage }: ChatProps) {
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 flex flex-col items-end ${isOpen ? 'w-80 h-[400px]' : 'w-12 h-12'}`}>
      {isOpen && (
        <div className="w-full h-full bg-[#14452f]/95 backdrop-blur-2xl rounded-[32px] border border-white/10 shadow-2xl flex flex-col overflow-hidden mb-4">
          <div className="flex items-center justify-between p-4 border-bottom border-white/5 bg-black/20">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Game Chat</h3>
            <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white">✕</button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.length === 0 ? (
              <p className="text-[10px] text-center text-white/20 italic mt-10">No messages yet. Say hi!</p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender === playerName;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] font-black uppercase tracking-wider text-white/20 mb-1 px-1">
                      {isMe ? 'You' : msg.sender}
                    </span>
                    <div className={`
                      px-3 py-2 rounded-2xl text-sm max-w-[90%] break-words
                      ${isMe ? 'bg-emerald-500 text-black font-medium' : 'bg-white/10 text-white'}
                    `}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-3 bg-black/20 border-t border-white/5 flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type message..."
              className="flex-1 bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-all"
            />
            <button
              type="submit"
              className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isOpen ? 'bg-white/10 text-white/60' : 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 hover:scale-110'
        }`}
      >
        <MessageSquare size={20} />
      </button>
    </div>
  );
}
