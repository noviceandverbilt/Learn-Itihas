
import React, { useState } from 'react';
import NotesView from './components/NotesView';
import ConversationView from './components/ConversationView';
import SavedNotesView from './components/SavedNotesView';
import { Note } from './types';
import './App.css';

type View = 'notes' | 'conversation' | 'saved';

const App: React.FC = () => {
  const [view, setView] = useState<View>('notes');
  const [savedNotes, setSavedNotes] = useState<Note[]>([]);

  const addNote = (note: Note) => {
    setSavedNotes(prevNotes => [...prevNotes, note]);
  };

  const deleteNote = (id: string) => {
    setSavedNotes(prevNotes => prevNotes.filter(note => note.id !== id));
  };
  
  const renderView = () => {
    switch (view) {
      case 'notes':
        return <NotesView onSave={addNote} />;
      case 'conversation':
        return <ConversationView />;
      case 'saved':
        return <SavedNotesView notes={savedNotes} onDelete={deleteNote} />;
      default:
        return <NotesView onSave={addNote} />;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Gemini Study Buddy</h1>
        <nav>
          <button onClick={() => setView('notes')} className={view === 'notes' ? 'active' : ''}>
            Generate Notes
          </button>
          <button onClick={() => setView('conversation')} className={view === 'conversation' ? 'active' : ''}>
            Live Conversation
          </button>
          <button onClick={() => setView('saved')} className={view === 'saved' ? 'active' : ''}>
            Saved Notes
          </button>
        </nav>
      </header>
      <main className="app-main">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
