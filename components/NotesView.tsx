
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateNotes, createTextToSpeech } from '../services/geminiService';
import { Note } from '../types';
import { LoaderIcon, PlayIcon, SaveIcon } from './icons';
import { decode, decodeAudioData } from '../utils/audioUtils';

interface NotesViewProps {
  onSave: (note: Note) => void;
}

const NotesView: React.FC<NotesViewProps> = ({ onSave }) => {
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const handleGenerate = async () => {
    if (!topic) {
      setError('Please enter a topic.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedNotes('');

    const result = await generateNotes(topic, context);
    if (result.success) {
      setGeneratedNotes(result.content);
    } else {
      setError(result.content);
    }
    setIsLoading(false);
  };

  const handleTextToSpeech = async () => {
    if (!generatedNotes) return;
    setIsSynthesizing(true);
    const audioContent = await createTextToSpeech(generatedNotes);
    if (audioContent) {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const audioBuffer = await decodeAudioData(decode(audioContent), audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
        } catch (e) {
            console.error("Error playing audio:", e);
            setError("Failed to play audio.");
        }
    } else {
        setError("Failed to generate audio for the notes.");
    }
    setIsSynthesizing(false);
  };
  
  const handleSave = () => {
    if (!generatedNotes || !topic) return;
    const newNote: Note = {
      id: Date.now().toString(),
      topic,
      content: generatedNotes,
      createdAt: new Date().toISOString(),
    };
    onSave(newNote);
    alert('Note saved!');
  };

  return (
    <div className="notes-view">
      <div className="notes-form">
        <h2>Generate Study Notes</h2>
        <p>Enter a topic and any additional context to generate detailed, textbook-style notes.</p>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., The French Revolution"
        />
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Optional: provide specific questions, key terms, or context to focus on."
          rows={5}
        />
        <button onClick={handleGenerate} disabled={isLoading}>
          {isLoading ? <><LoaderIcon className="spinner" /> Generating...</> : 'Generate Notes'}
        </button>
        {error && <p className="error-message">{error}</p>}
      </div>
      
      {generatedNotes && (
        <div className="generated-notes">
          <div className="notes-header">
            <h3>Generated Notes for "{topic}"</h3>
            <div className="notes-actions">
              <button onClick={handleTextToSpeech} disabled={isSynthesizing} title="Read notes aloud">
                {isSynthesizing ? <LoaderIcon className="spinner" /> : <PlayIcon />}
              </button>
              <button onClick={handleSave} title="Save notes">
                <SaveIcon />
              </button>
            </div>
          </div>
          <div className="notes-content">
            <ReactMarkdown>{generatedNotes}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesView;
