import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ACHIEVEMENTS_DEFINITIONS, GRADES_DATA } from '../constants';
import type { SubjectGrade, Achievement } from './../types';
import { generateHomeworkHelp } from '../services/geminiService';
import { getGrades } from '../services/googleSheetsService';

const Grades: React.FC = () => {
  const [grades, setGrades] = useState<SubjectGrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiSummary, setAiSummary] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    const loadGrades = async () => {
      try {
        setError(null);
        setIsLoading(true);
        const fetchedGrades = await getGrades();
        setGrades(fetchedGrades);
      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : "Произошла неизвестная ошибка.";
        setError(`Не удалось подключиться к Google Sheets: "${errorMessage}". Показаны демонстрационные данные.`);
        setGrades(GRADES_DATA); // Use fallback data.
      } finally {
        setIsLoading(false);
      }
    };

    loadGrades();
  }, []);

  const gradesBySubject = useMemo(() => {
    return grades.reduce((acc, grade) => {
      if (!acc[grade.subject]) {
        acc[grade.subject] = [];
      }
      acc[grade.subject].push(grade);
      return acc;
    }, {} as Record<string, SubjectGrade[]>);
  }, [grades]);

  const numericScores = useMemo(() => grades.map(g => g.score).filter(s => typeof s === 'number') as number[], [grades]);

  const averageGrade = useMemo(() => {
    if (numericScores.length === 0) return 0;
    const sum = numericScores.reduce((acc, score) => acc + score, 0);
    return (sum / numericScores.length).toFixed(2);
  }, [numericScores]);
  
  const unlockedAchievements = useMemo((): Achievement[] => {
    return ACHIEVEMENTS_DEFINITIONS.map(def => {
        let unlocked = false;
        if (grades.length === 0) return { ...def, unlocked };

        switch (def.id) {
            case 'excellent':
                if (numericScores.filter(s => s === 5).length >= 3) {
                    unlocked = true;
                }
                break;
            case 'consistent':
                if (numericScores.length > 0 && Math.min(...numericScores) >= 4) {
                    unlocked = true;
                }
                break;
            case 'progress':
                for (const subject in gradesBySubject) {
                    const subjectGrades = gradesBySubject[subject].filter(g => typeof g.score === 'number').map(g => g.score as number);
                    if (subjectGrades.length > 1 && subjectGrades[subjectGrades.length - 1] > subjectGrades[0]) {
                        unlocked = true;
                        break;
                    }
                }
                break;
        }
        return { ...def, unlocked };
    });
  }, [numericScores, gradesBySubject, grades.length]);

  const fetchAiSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    setSummaryError(null);
    setAiSummary('');

    const gradesSummary = Object.entries(gradesBySubject)
      .map(([subject, grades]) => {
        const gradeList = grades.map(g => `${g.topic}: ${g.score}`).join(', ');
        return `- ${subject}: ${gradeList}`;
      })
      .join('\n');
    
    const achievementsSummary = unlockedAchievements.filter(a => a.unlocked).map(a => `- ${a.title}: ${a.description}`).join('\n');

    const prompt = `
      Проанализируй мою успеваемость. Вот мои оценки:
      ---
      ${gradesSummary}
      ---
      Мои достижения:
      ---
      ${achievementsSummary.length > 0 ? achievementsSummary : 'Пока нет достижений.'}
      ---
      Дай мне краткий, но содержательный анализ моей успеваемости. 
      Выдели сильные стороны и области, на которые стоит обратить внимание. 
      Предложи 1-2 конкретных совета для улучшения. 
      Будь позитивным и мотивирующим. Ответ дай в виде маркированного списка.
    `;
    
    try {
        const response = await generateHomeworkHelp(prompt);
        setAiSummary(response);
    } catch (err) {
        setSummaryError('Не удалось сгенерировать анализ. Попробуйте позже.');
    } finally {
        setIsSummaryLoading(false);
    }
  }, [gradesBySubject, unlockedAchievements]);

  const getScoreColor = (score: number | string) => {
    if (typeof score === 'string') return 'text-blue-500';
    if (score >= 4) return 'text-green-500';
    if (score === 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-text-primary mb-2">Оценки</h2>
      <p className="text-sm text-text-secondary mb-6">Средний балл: <span className={`font-bold text-lg text-accent ${isLoading ? 'opacity-50' : ''}`}>{averageGrade}</span></p>

      {error && (
         <div className="mb-6 p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
           <p className="font-bold text-yellow-800">⚠️ Проблема с подключением</p>
           <p className="text-sm mt-1 text-yellow-700">{error}</p>
         </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2 text-text-secondary">
            <svg className="animate-spin h-6 w-6 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span className="font-semibold">Загрузка оценок из Google Sheets...</span>
          </div>
        </div>
      ) : grades.length === 0 ? (
         <div className="flex items-center justify-center h-64">
           <div className="text-center p-6 bg-highlight rounded-2xl">
             <p className="font-bold text-text-primary">Оценок пока нет</p>
             <p className="text-text-secondary mt-1">Как только они появятся, они будут отображены здесь.</p>
           </div>
         </div>
      ) : (
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Grades Section */}
        <div className="md:col-span-2 space-y-4">
          {Object.entries(gradesBySubject).map(([subject, subjectGrades]) => (
            <div key={subject} className="bg-secondary rounded-3xl shadow-soft-subtle border border-border-color p-5">
              <h3 className="text-xl font-bold text-text-primary mb-4">{subject}</h3>
              <ul className="space-y-3">
                {subjectGrades.map((grade, index) => (
                  <li key={`${grade.topic}-${index}`} className="flex justify-between items-center p-3 bg-highlight rounded-xl">
                    <div>
                      <p className="font-semibold text-text-primary">{grade.topic}</p>
                      <p className="text-xs text-text-secondary">{grade.date}</p>
                    </div>
                    <span className={`text-2xl font-bold ${getScoreColor(grade.score)}`}>{grade.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Achievements and AI Summary Section */}
        <div className="space-y-6">
           <div className="bg-secondary rounded-3xl shadow-soft-subtle border border-border-color p-5">
                <h3 className="text-xl font-bold text-text-primary mb-4">🏆 Достижения</h3>
                <ul className="space-y-3">
                    {unlockedAchievements.map(ach => (
                        <li key={ach.id} className={`flex items-start space-x-3 p-3 rounded-xl transition-all ${ach.unlocked ? 'bg-green-500/10' : 'bg-highlight opacity-60'}`}>
                           <span className="text-2xl">{ach.emoji}</span>
                           <div>
                             <p className={`font-bold ${ach.unlocked ? 'text-green-600' : 'text-text-primary'}`}>{ach.title}</p>
                             <p className="text-xs text-text-secondary">{ach.description}</p>
                           </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="bg-secondary rounded-3xl shadow-soft-subtle border border-border-color p-5">
              <h3 className="text-xl font-bold text-text-primary mb-3">🧠 AI Анализ успеваемости</h3>
              <p className="text-sm text-text-secondary mb-4">Получите персональные рекомендации по улучшению ваших результатов.</p>
              <button onClick={fetchAiSummary} disabled={isSummaryLoading} className="w-full bg-accent text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-accent-hover transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">
                  {isSummaryLoading ? (
                      <><span>Анализирую...</span></>
                  ) : (
                      <><span>✨</span><span>Получить анализ</span></>
                  )}
              </button>
              {summaryError && <p className="text-red-500 mt-4 text-center text-sm">{summaryError}</p>}
              {aiSummary && (
                <div className="mt-5 p-3 bg-highlight rounded-xl text-sm">
                  <div className="text-text-primary whitespace-pre-wrap prose prose-sm max-w-none">{aiSummary}</div>
                </div>
              )}
            </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default Grades;