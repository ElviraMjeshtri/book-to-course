import React, { useState } from "react";

interface ChatPanelProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatPanel({ onSendMessage, isLoading }: ChatPanelProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span className="chat-icon">💬</span>
        <h4>Refine Script</h4>
      </div>
      <p className="chat-hint">
        Give feedback to refine (e.g., "make it shorter", "add code examples", "simplify narration")
      </p>
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your feedback..."
          disabled={isLoading}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className="btn btn-primary btn-sm"
        >
          {isLoading ? "Refining..." : "Send"}
        </button>
      </form>
    </div>
  );
}
