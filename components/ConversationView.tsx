
import React from 'react';
import { useLiveConversation } from '../hooks/useLiveConversation';
import { MicIcon, StopIcon, LoaderIcon } from './icons';

const ConversationView: React.FC = () => {
  const { isRecording, isConnecting, transcriptionHistory, error, startConversation, stopConversation } = useLiveConversation();

  const handleToggleConversation = () => {
    if (isRecording) {
      stopConversation();
    } else {
      startConversation();
    }
  };

  return (
    <div className="conversation-view">
      <h2>Live Conversation Practice</h2>
      <p>Click the microphone to start a conversation with your AI study buddy. Practice explaining concepts, ask questions, and get instant feedback.</p>
      
      <div className="conversation-controls">
        <button onClick={handleToggleConversation} disabled={isConnecting} className={`mic-button ${isRecording ? 'recording' : ''}`}>
          {isConnecting ? <LoaderIcon className="spinner" /> : (isRecording ? <StopIcon /> : <MicIcon />)}
        </button>
        {isConnecting && <p>Connecting...</p>}
        {isRecording && <p>Recording... speak now.</p>}
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="transcription-display">
        {transcriptionHistory.length === 0 && !isRecording && (
            <p className="placeholder-text">Your conversation will appear here.</p>
        )}
        {transcriptionHistory.map((turn) => (
          <div key={turn.id} className={`turn ${turn.type}`}>
            <span className="speaker-label">{turn.type === 'user' ? 'You' : 'AI'}</span>
            <p>{turn.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationView;
