export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  size: string;
  timestamp: Date;
}

export interface McqOption {
  id: string;
  text: string;
}

export interface McqQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface UploadedFile {
  name: string;
  type: string;
  content: string; // Base64
}

export type AppView = 'dashboard' | 'chat' | 'mcq' | 'image';

export type ImageSize = '1K' | '2K' | '4K';