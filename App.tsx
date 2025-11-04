import React, { useState } from 'react';
import Schedule from './components/Schedule';
import Grades from './components/Grades';
import Chat from './components/Chat';
import Games from './components/Games';
import { ScheduleIcon, GradesIcon, ChatIcon, GamesIcon } from './components/icons/Icons';

type View = 'schedule' | 'grades' | 'chat' | 'games';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('schedule');

  const renderView = () => {
    switch (activeView) {
      case 'schedule':
        return <Schedule />;
      case 'grades':
        return <Grades />;
      case 'chat':
        return <Chat />;
      case 'games':
        return <Games />;
      default:
        return <Schedule />;
    }
  };

  const navItems = [
    { id: 'schedule', label: 'Расписание', icon: ScheduleIcon },
    { id: 'grades', label: 'Оценки', icon: GradesIcon },
    { id: 'chat', label: 'AI Чат', icon: ChatIcon },
    { id: 'games', label: 'Игры', icon: GamesIcon },
  ];

  return (
    <div className="bg-primary min-h-screen flex flex-col text-text-primary font-sans">
      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24">
        {renderView()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-4 left-4 right-4 bg-secondary/70 backdrop-blur-2xl border border-border-color rounded-2xl shadow-soft-lg z-50">
        <div className="flex justify-around items-center p-2">
           {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={`flex flex-col items-center justify-center space-y-1 p-2 rounded-xl w-20 h-16 transition-colors text-xs font-semibold ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:bg-highlight hover:text-text-primary'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default App;
