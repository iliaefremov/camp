import React, { useState } from 'react';
import MafiaGame from './MafiaGame';

const Games: React.FC = () => {
    const [activeGame, setActiveGame] = useState<string | null>(null);

    const renderGame = () => {
        switch (activeGame) {
            case 'mafia':
                return <MafiaGame onExit={() => setActiveGame(null)} />;
            default:
                return (
                    <div className="text-center animate-fade-in">
                        <h2 className="text-3xl font-bold text-text-primary mb-6">Игры</h2>
                        <p className="text-text-secondary mb-8">Выберите игру, чтобы расслабиться и отвлечься от учебы.</p>
                        <div className="flex justify-center">
                            <button
                                onClick={() => setActiveGame('mafia')}
                                className="bg-accent text-white font-bold py-3 px-6 rounded-xl text-lg hover:bg-accent-hover transition-colors shadow-soft"
                            >
                                Играть в Мафию
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="animate-fade-in">
            {renderGame()}
        </div>
    );
};

export default Games;
