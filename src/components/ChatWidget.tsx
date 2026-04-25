import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "bot";
  text: string;
}

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "გამარჯობა! 👋 მე ვარ AI ასისტენტი. როგორ შემიძლია დაგეხმაროთ?" }
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Mock response after 800ms
    setTimeout(() => {
      const responses = [
        "ვცდილობ დაგეხმაროთ...",
        "მაპატიეთ, მე ჯერ კიდევ ვსწავლობ. შეგიძლიათ დააზუსტოთ?",
        "ამ კითხვაზე პასუხის საპოვნელად ვამოწმებ მონაცემებს...",
        "ზედნადებების საძიებლად შეგიძლიათ გამოიყენოთ ფილტრები მთავარ გვერდზე.",
        "RS.ge-სთან კავშირი სტაბილურია."
      ];
      const botMessage: Message = { 
        role: "bot", 
        text: responses[Math.floor(Math.random() * responses.length)] 
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-tr from-[var(--bg-header-from)] to-[var(--bg-header-to)] text-white shadow-lg shadow-blue-500/30 flex items-center justify-center z-50 hover:scale-105 active:scale-95 transition-transform"
        id="ai-assistant-btn"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[380px] h-[520px] bg-[var(--bg-surface)] rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-[var(--border-default)]"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-[var(--bg-header-from)] to-[var(--bg-header-to)] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-bold text-sm">AI ასისტენტი</h3>
                  <p className="text-[10px] text-blue-100 opacity-80">ონლაინ • მზად არის დასახმარებლად</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-2 max-w-[80%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === "user" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"}`}>
                      {m.role === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm ${
                      m.role === "user" 
                        ? "bg-gradient-to-r from-[var(--bg-header-from)] to-[var(--bg-header-to)] text-white rounded-tr-none" 
                        : "bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-tl-none"
                    }`}>
                      {m.text}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[var(--border-default)]">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="დაწერეთ შეტყობინება..."
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[var(--text-primary)]"
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 p-2 bg-gradient-to-r from-[var(--bg-header-from)] to-[var(--bg-header-to)] text-white rounded-lg hover:scale-105 active:scale-95 transition-transform"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
