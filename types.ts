export interface ScheduleItem {
  id: number;
  subject: string;
  time: string;
  classroom: string;
  teacher: string;
  homework: string;
  isImportant: boolean;
}

export interface DaySchedule {
  day: string;
  classes: ScheduleItem[];
}

export interface SubjectGrade {
  user_id: string;
  subject: string;
  topic: string;
  date: string;
  score: number | 'зачет';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  points: number;
  unlocked: boolean;
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'ai';
}

export interface Player {
  id: number;
  name: string;
  role: 'Mafia' | 'Doctor' | 'Civilian';
  isAlive: boolean;
  isUser: boolean;
}

export type GamePhase = 'setup' | 'night' | 'day' | 'ended';

export interface GameState {
  players: Player[];
  phase: GamePhase;
  dayNumber: number;
  log: { type: 'narration' | 'vote' | 'system', text: string }[];
  winner: 'Mafia' | 'Civilians' | null;
  history: { role: string; parts: { text: string }[] }[];
}
