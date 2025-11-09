
export interface TranscriptionTurn {
  id: string;
  type: 'user' | 'model';
  text: string;
}

export interface Note {
  id: string;
  topic: string;
  content: string;
  createdAt: string;
}
