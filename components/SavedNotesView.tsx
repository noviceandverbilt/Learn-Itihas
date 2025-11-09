
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Note } from '../types';
import { TrashIcon } from './icons';

interface SavedNotesViewProps {
  notes: Note[];
  onDelete: (id: string) => void;
}

const SavedNotesView: React.FC<SavedNotesViewProps> = ({ notes, onDelete }) => {
  // Sort notes by creation date, newest first
  const sortedNotes = [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="saved-notes-view">
      <h2>Saved Notes</h2>
      {sortedNotes.length === 0 ? (
        <p className="placeholder-text">You haven't saved any notes yet. Go to "Generate Notes" to create and save some!</p>
      ) : (
        <div className="notes-list">
          {sortedNotes.map(note => (
            <div key={note.id} className="note-card">
              <div className="note-card-header">
                <h3>{note.topic}</h3>
                <div className="note-card-actions">
                    <span className="note-date">{new Date(note.createdAt).toLocaleDateString()}</span>
                    <button onClick={() => onDelete(note.id)} title="Delete note" className="icon-button">
                        <TrashIcon />
                    </button>
                </div>
              </div>
              <div className="note-card-content">
                <ReactMarkdown>{note.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedNotesView;
