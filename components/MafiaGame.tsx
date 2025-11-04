import React, { useState, useEffect, useCallback } from 'react';
import type { GameState, Player } from '../types';
import { runMafiaLogic } from '../services/geminiService';

interface MafiaGameProps {
  onExit: () => void;
}

const MafiaGame: React.FC<MafiaGameProps> = ({ onExit }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkWinCondition = useCallback((players: Player[]) => {
    const livingPlayers = players.filter(p => p.isAlive);
    const mafiaCount = livingPlayers.filter(p => p.role === 'Mafia').length;
    const civilianCount = livingPlayers.filter(p => p.role !== 'Mafia').length;

    if (mafiaCount === 0) {
      return 'Civilians';
    }
    if (mafiaCount >= civilianCount) {
      return 'Mafia';
    }
    return null;
  }, []);

  // FIX: Accept the prompt to store it in the history accurately.
  const handleApiResponse = useCallback((response: any, prompt: string) => {
    setGameState(prev => {
      if (!prev) return null;

      let newPlayers = [...prev.players];
      const newLog = [...prev.log];
      newLog.push({ type: 'narration', text: response.narration });

      if (response.killedId && response.killedId !== response.savedId) {
        newPlayers = newPlayers.map(p => p.id === response.killedId ? { ...p, isAlive: false } : p);
      }
      if (response.votedOutId) {
        newPlayers = newPlayers.map(p => p.id === response.votedOutId ? { ...p, isAlive: false } : p);
        const votedOutPlayer = prev.players.find(p => p.id === response.votedOutId);
        if (votedOutPlayer) {
          newLog.push({ type: 'system', text: `${votedOutPlayer.name} был(а) ${votedOutPlayer.role}.` });
        }
      }

      const winner = checkWinCondition(newPlayers);
      
      return {
        ...prev,
        players: newPlayers,
        log: newLog,
        phase: winner ? 'ended' : prev.phase === 'night' ? 'day' : 'night',
        dayNumber: prev.phase === 'day' ? prev.dayNumber + 1 : prev.dayNumber,
        winner,
        history: [
            ...prev.history,
            // FIX: Use the actual prompt sent to the AI for the user's turn in history.
            { role: 'user', parts: [{ text: prompt }] },
            { role: 'model', parts: [{ text: JSON.stringify(response)}] }
        ]
      };
    });
  }, [checkWinCondition]);

  const runGameTurn = useCallback(async (userAction: { type: string; payload?: any } | null = null) => {
    if (!gameState) return;
    setIsLoading(true);
    setError(null);
    try {
      // FIX: Handle the new return object from runMafiaLogic.
      const { responseText, promptForHistory } = await runMafiaLogic(gameState, userAction);
      const response = JSON.parse(responseText);
      // FIX: Pass the prompt to the response handler.
      handleApiResponse(response, promptForHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка.');
    } finally {
      setIsLoading(false);
    }
  }, [gameState, handleApiResponse]);

  useEffect(() => {
    if (gameState?.phase === 'night' && !isLoading) {
      runGameTurn();
    }
  }, [gameState?.phase, isLoading, runGameTurn]);
  

  const startGame = () => {
    const players: Player[] = [
      { id: 1, name: 'Игрок 1', role: 'Civilian', isAlive: true, isUser: true },
      { id: 2, name: 'Игрок 2', role: 'Civilian', isAlive: true, isUser: false },
      { id: 3, name: 'Игрок 3', role: 'Civilian', isAlive: true, isUser: false },
      { id: 4, name: 'Игрок 4', role: 'Doctor', isAlive: true, isUser: false },
      { id: 5, name: 'Игрок 5', role: 'Mafia', isAlive: true, isUser: false },
    ];
    // Shuffle AI roles
    const aiRoles = ['Civilian', 'Civilian', 'Doctor', 'Mafia'];
    for (let i = aiRoles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [aiRoles[i], aiRoles[j]] = [aiRoles[j], aiRoles[i]];
    }
    const aiPlayers = players.filter(p => !p.isUser);
    aiPlayers.forEach((p, i) => {
        p.role = aiRoles[i] as 'Mafia' | 'Doctor' | 'Civilian';
    });

    setGameState({
      players,
      phase: 'night',
      dayNumber: 1,
      log: [{ type: 'system', text: 'Добро пожаловать в игру "Мафия"! Вы — мирный житель. Наступает ночь...' }],
      winner: null,
      history: []
    });
  };

  const handleVote = (playerId: number) => {
    if (isLoading || gameState?.phase !== 'day') return;
    runGameTurn({ type: 'vote', payload: { votedForId: playerId } });
  };

  if (!gameState) {
    return (
      <div className="animate-fade-in text-center">
        <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold text-text-primary">Мафия</h2><button onClick={onExit} className="bg-highlight text-text-secondary font-bold py-2 px-4 rounded-xl text-sm hover:bg-border-color transition-colors">Назад к играм</button></div>
        <div className="bg-secondary p-8 rounded-2xl"><p className="text-lg mb-4">Готовы проверить свою интуицию?</p><button onClick={startGame} className="bg-accent text-white font-bold py-3 px-6 rounded-xl text-lg hover:bg-accent-hover transition-colors shadow-soft">Начать игру</button></div>
      </div>
    );
  }

  const userPlayer = gameState.players.find(p => p.isUser);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4"><h2 className="text-3xl font-bold text-text-primary">Мафия: День {gameState.dayNumber}</h2><button onClick={onExit} className="bg-highlight text-text-secondary font-bold py-2 px-4 rounded-xl text-sm hover:bg-border-color transition-colors">Выйти из игры</button></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-secondary rounded-3xl shadow-soft-subtle border border-border-color p-5 h-[60vh] flex flex-col">
          <h3 className="text-xl font-bold text-text-primary mb-4">Журнал событий</h3>
          <div className="flex-grow overflow-y-auto space-y-3 pr-2 hide-scrollbar">
            {gameState.log.map((entry, index) => (<div key={index} className={`p-3 rounded-lg ${entry.type === 'system' ? 'bg-blue-500/10 text-blue-800' : 'bg-highlight'}`}><p className="text-sm">{entry.text}</p></div>))}
            {isLoading && <div className="p-3 rounded-lg bg-highlight flex items-center space-x-2"><div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse [animation-delay:-0.3s]"></div><div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse"></div><span className="text-sm text-text-secondary">ИИ-Ведущий думает...</span></div>}
            {error && <div className="p-3 rounded-lg bg-red-500/10 text-red-700 text-sm">{error}</div>}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-secondary rounded-3xl shadow-soft-subtle border border-border-color p-5"><h3 className="text-xl font-bold text-text-primary mb-4">Игроки</h3><ul className="space-y-2">{gameState.players.map(p => (<li key={p.id} className={`flex justify-between items-center p-2 rounded-lg ${!p.isAlive ? 'opacity-50 line-through' : ''}`}><span className="font-semibold">{p.name}{p.isUser && ' (Вы)'}</span><span>{p.isAlive ? '✅' : '💀'}</span></li>))}</ul></div>
          <div className="bg-secondary rounded-3xl shadow-soft-subtle border border-border-color p-5">
            {gameState.phase === 'ended' ? (
                <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">{gameState.winner === 'Civilians' ? '🎉 Победа Мирных! 🎉' : '💀 Победила Мафия 💀'}</h3>
                    <p className="text-text-secondary mb-4">Вы {gameState.winner === userPlayer?.role || (gameState.winner === 'Civilians' && userPlayer?.role !== 'Mafia') ? 'победили!' : 'проиграли.'}</p>
                    <button onClick={startGame} className="w-full bg-accent text-white font-bold py-2 px-4 rounded-xl hover:bg-accent-hover">Играть снова</button>
                </div>
            ) : gameState.phase === 'day' && userPlayer?.isAlive ? (
              <div><h3 className="text-xl font-bold text-text-primary mb-4">Голосование</h3><p className="text-sm text-text-secondary mb-3">Выберите, кого вы хотите исключить:</p><div className="space-y-2">{gameState.players.filter(p => p.isAlive).map(p => (<button key={p.id} onClick={() => handleVote(p.id)} disabled={p.isUser || isLoading} className="w-full text-left p-2 bg-highlight rounded-lg hover:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed">{p.name}</button>))}</div></div>
            ) : (
                <div><h3 className="text-xl font-bold text-text-primary mb-4">Статус</h3><p className="text-sm text-text-secondary">{gameState.phase === 'night' ? 'Наступила ночь. Город засыпает...' : !userPlayer?.isAlive ? 'Вы выбыли. Наблюдайте за игрой.' : 'Ожидание...'}</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MafiaGame;