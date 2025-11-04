import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { SCHEDULE_WEEK_1, SCHEDULE_WEEK_2 } from '../constants';
// FIX: Corrected import path for types.
import type { ScheduleItem, DaySchedule } from './../types';
import { generateHomeworkHelp } from '../services/geminiService';

const DAYS_OF_WEEK = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
const EMPTY_SCHEDULE_ITEM: Omit<ScheduleItem, 'id'> = { subject: '', time: '', classroom: '', teacher: '', homework: '', isImportant: false };

const Schedule: React.FC = () => {
  const [activeWeek, setActiveWeek] = useState<1 | 2>(1);
  const [scheduleWeek1, setScheduleWeek1] = useState<DaySchedule[]>(SCHEDULE_WEEK_1);
  const [scheduleWeek2, setScheduleWeek2] = useState<DaySchedule[]>(SCHEDULE_WEEK_2);

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{item: ScheduleItem | Omit<ScheduleItem, 'id'>, day: string} | null>(null);

  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ScheduleItem | null>(null);
  
  const [aiHelpResponse, setAiHelpResponse] = useState('');
  const [isHelpLoading, setIsHelpLoading] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);

  const [aiPlanResponse, setAiPlanResponse] = useState('');
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [aiSummaryResponse, setAiSummaryResponse] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scheduleData = activeWeek === 1 ? scheduleWeek1 : scheduleWeek2;

  // --- Date and Highlighting Logic ---
  const today = useMemo(() => new Date(), []);
  const todayName = useMemo(() => (new Intl.DateTimeFormat('ru-RU', { weekday: 'long' })).format(today).replace(/^\w/, c => c.toUpperCase()), [today]);
  
  const weekDates = useMemo(() => {
    const weekOffset = activeWeek === 1 ? 0 : 1;
    const currentDayOfWeek = today.getDay(); // Sunday: 0, Monday: 1
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const mondayOfCurrentWeek = new Date(today);
    mondayOfCurrentWeek.setDate(today.getDate() + mondayOffset);
    mondayOfCurrentWeek.setHours(0, 0, 0, 0);

    const targetMonday = new Date(mondayOfCurrentWeek);
    targetMonday.setDate(mondayOfCurrentWeek.getDate() + (weekOffset * 7));

    return Array.from({ length: 5 }).map((_, i) => {
      const date = new Date(targetMonday);
      date.setDate(targetMonday.getDate() + i);
      return date;
    });
  }, [activeWeek, today]);

  const todayDateFormatted = useMemo(() => (new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })).format(today), [today]);

  const isCurrentWeek = useMemo(() => {
    if (!weekDates.length) return false;
    const startOfWeek = weekDates[0];
    const endOfWeek = new Date(weekDates[4]);
    endOfWeek.setHours(23, 59, 59, 999);
    return today >= startOfWeek && today <= endOfWeek;
  }, [weekDates, today]);
  
  useEffect(() => {
    if (isCurrentWeek && DAYS_OF_WEEK.includes(todayName)) {
      const todayRef = dayRefs.current[todayName];
      if (todayRef && window.innerWidth < 768) {
        setTimeout(() => {
           todayRef.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 300);
      }
    }
  }, [isCurrentWeek, todayName, activeWeek]);


  // --- Admin CRUD Logic ---
  const handleOpenEditModal = useCallback((item: ScheduleItem | null, day: string) => {
    setEditingItem({ item: item || EMPTY_SCHEDULE_ITEM, day });
    setIsEditModalOpen(true);
  }, []);
  
  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  }, []);

  const handleSaveItem = useCallback((itemToSave: ScheduleItem | Omit<ScheduleItem, 'id'>, day: string) => {
    const setSchedule = activeWeek === 1 ? setScheduleWeek1 : setScheduleWeek2;
    
    setSchedule(prevSchedule => {
        const newSchedule = JSON.parse(JSON.stringify(prevSchedule));
        let daySchedule = newSchedule.find((d: DaySchedule) => d.day === day);

        if (!daySchedule) {
            daySchedule = { day, classes: [] };
            newSchedule.push(daySchedule);
        }
        
        if ('id' in itemToSave) {
             const classIndex = daySchedule.classes.findIndex((c: ScheduleItem) => c.id === itemToSave.id);
             if (classIndex !== -1) {
                daySchedule.classes[classIndex] = itemToSave;
             }
        } else {
            const newItem = { ...itemToSave, id: Date.now() };
            daySchedule.classes.push(newItem);
        }
        
        return newSchedule;
    });

    handleCloseEditModal();
  }, [activeWeek]);
  
  const handleDeleteItem = useCallback((itemId: number, day: string) => {
    if (window.confirm('Вы уверены, что хотите удалить это занятие?')) {
      const setSchedule = activeWeek === 1 ? setScheduleWeek1 : setScheduleWeek2;
      setSchedule(prevSchedule =>
        prevSchedule.map(d =>
          d.day === day
            ? { ...d, classes: d.classes.filter(c => c.id !== itemId) }
            : d
        )
      );
    }
  }, [activeWeek]);

  // --- AI Logic ---
  const handleGetHelpClick = (item: ScheduleItem) => {
    setModalContent(item);
    setIsHelpModalOpen(true);
    setAiHelpResponse('');
    setHelpError(null);
  };

  const closeHelpModal = () => setIsHelpModalOpen(false);

  const fetchAiHelp = useCallback(async () => {
    if (!modalContent) return;
    setIsHelpLoading(true);
    setHelpError(null);
    try {
      const prompt = `Объясни следующую тему или задачу простыми словами, как если бы ты был опытным наставником. Дай ключевые моменты и, возможно, простой пример. Задача: "${modalContent.homework}" по предмету "${modalContent.subject}".`;
      const response = await generateHomeworkHelp(prompt);
      setAiHelpResponse(response);
    } catch (err) {
      setHelpError('Не удалось получить ответ от AI. Попробуйте позже.');
    } finally {
      setIsHelpLoading(false);
    }
  }, [modalContent]);
  
  const openPlanModal = () => {
    setAiPlanResponse('');
    setPlanError(null);
    setIsPlanModalOpen(true);
  };

  const closePlanModal = () => setIsPlanModalOpen(false);

  const fetchStudyPlan = useCallback(async () => {
    setIsPlanLoading(true);
    setPlanError(null);
    const importantTasks = scheduleData.flatMap(day => day.classes).filter(item => item.isImportant).map(item => `- ${item.subject}: ${item.homework}`).join('\n');
    const scheduleSummary = scheduleData.map(day => `${day.day}:\n${day.classes.map(c => `  - ${c.time}: ${c.subject}`).join('\n') || '  - Свободный день'}`).join('\n\n');
    const prompt = `Я студент, и мне нужна помощь в организации учебного времени на неделю. Вот мое расписание: ---\n${scheduleSummary}\n---\nА вот мои важные задания: ---\n${importantTasks.length > 0 ? importantTasks : 'Важных заданий нет.'}\n---\nСоздай для меня детальный учебный план. Предложи, когда лучше заниматься каждым заданием, разбей большие задачи на шаги. Учитывай мое расписание. Оформи план по дням. Будь мотивирующим.`;
    try {
        const response = await generateHomeworkHelp(prompt);
        setAiPlanResponse(response);
    } catch (err) {
        setPlanError('Не удалось сгенерировать план. Попробуйте позже.');
    } finally {
        setIsPlanLoading(false);
    }
  }, [scheduleData]);

  const openSummaryModal = () => {
    setAiSummaryResponse('');
    setSummaryError(null);
    setIsSummaryModalOpen(true);
  };

  const closeSummaryModal = () => setIsSummaryModalOpen(false);

  const fetchWeekSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    setSummaryError(null);
    const importantTasks = scheduleData.flatMap(d => d.classes).filter(i => i.isImportant).map(i => `- ${i.subject}: ${i.homework}`).join('\n');
    const scheduleSummary = scheduleData.map(d => `${d.day}:\n${d.classes.map(c => `  - ${c.time}: ${c.subject}`).join('\n') || '  - Свободный день'}`).join('\n\n');
    const prompt = `Проанализируй мое расписание и важные задачи на неделю.\nРасписание:\n---\n${scheduleSummary}\n---\nВажные задачи:\n---\n${importantTasks.length > 0 ? importantTasks : 'Важных заданий нет.'}\n---\nСоздай краткую и четкую сводку на неделю. Выдели 2-3 самых ключевых момента. Ответ должен быть коротким, в виде маркированного списка.`;
    try {
        const response = await generateHomeworkHelp(prompt);
        setAiSummaryResponse(response);
    } catch (err) {
        setSummaryError('Не удалось сгенерировать сводку. Попробуйте позже.');
    } finally {
        setIsSummaryLoading(false);
    }
  }, [scheduleData]);
  
  const weekTabs = [{id: 1, label: 'Первая неделя'}, {id: 2, label: 'Вторая неделя'}];

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-bold text-text-primary">Расписание</h2>
          <p className="text-sm text-text-secondary mt-1">Сегодня: {todayDateFormatted}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="admin-toggle" className="flex items-center cursor-pointer">
            <span className="mr-3 text-sm font-medium text-text-secondary">Режим админа</span>
            <div className="relative">
              <input type="checkbox" id="admin-toggle" className="sr-only" checked={isAdminMode} onChange={() => setIsAdminMode(!isAdminMode)} />
              <div className="block bg-highlight w-14 h-8 rounded-full"></div>
              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${isAdminMode ? 'translate-x-6 bg-accent' : ''}`}></div>
            </div>
          </label>
        </div>
      </div>
       <div className="flex flex-wrap items-center justify-start gap-2 mb-6">
          <button onClick={openSummaryModal} className="bg-accent/10 text-accent font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 hover:bg-accent/20 transition-colors"><span>📊</span><span>Сводка недели</span></button>
          <button onClick={openPlanModal} className="bg-accent/10 text-accent font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 hover:bg-accent/20 transition-colors"><span>📝</span><span>Сгенерировать план</span></button>
        </div>
      <div className="flex space-x-2 border-b border-border-color mb-6">
        {weekTabs.map(week => (<button key={week.id} onClick={() => setActiveWeek(week.id as 1 | 2)} className={`px-4 py-2 text-base font-semibold transition-colors rounded-t-lg ${activeWeek === week.id ? 'border-b-2 border-accent text-accent' : 'text-text-secondary hover:text-text-primary'}`}>{week.label}</button>))}
      </div>
      <div className="flex overflow-x-auto space-x-3 pb-4 md:grid md:grid-cols-5 md:items-start md:space-x-0 md:gap-4 md:pb-0 hide-scrollbar">
        {DAYS_OF_WEEK.map((dayName, index) => {
          const date = weekDates[index];
          const formattedDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
          const dayData = scheduleData.find(d => d.day === dayName);
          const isToday = isCurrentWeek && dayName === todayName;

          return (
            <div key={dayName} ref={el => { dayRefs.current[dayName] = el; }} className={`flex-shrink-0 w-64 md:w-auto flex flex-col p-2 rounded-2xl transition-colors ${isToday ? 'bg-accent/5' : ''}`}>
              <h3 className={`text-base font-semibold text-center mb-2 md:mb-3 ${isToday ? 'text-accent' : 'text-text-primary'}`}>{dayName}, <span className="font-normal">{formattedDate}</span></h3>
              <div className="space-y-3">
                {dayData && dayData.classes.length > 0 ? dayData.classes.map((item) => (
                   <div key={item.id} className="bg-secondary rounded-2xl shadow-soft-subtle border border-border-color p-3 flex flex-col text-sm transition-transform hover:scale-105">
                        <div className="flex-grow">
                            <div className="flex justify-between items-start mb-2"><p className="font-bold text-text-primary pr-2 leading-tight">{item.subject}</p>{item.isImportant && <span className="text-base" title="Важное">⭐</span>}</div>
                            <div className="space-y-1 text-text-secondary text-xs mb-3"><p className="flex items-center"><span className="opacity-75 mr-2">⏰</span><span className="font-medium">{item.time}</span></p><p className="flex items-start"><span className="opacity-75 mr-2 pt-0.5">📍</span><span>{item.classroom} / {item.teacher}</span></p></div>
                            <div className="text-xs"><p className="text-text-secondary font-medium mb-1">📝 Домашнее задание:</p><p className="text-text-primary break-words leading-snug">{item.homework}</p></div>
                        </div>
                        {isAdminMode ? (
                           <div className="flex items-center justify-between pt-3 mt-3 border-t border-border-color">
                                <button onClick={() => handleGetHelpClick(item)} className="bg-accent/10 text-accent font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center space-x-2 hover:bg-accent/20 transition-colors">✨ AI</button>
                                <div className="flex items-center space-x-2">
                                  <button onClick={() => handleOpenEditModal(item, dayName)} className="text-text-secondary hover:text-accent transition-colors">✏️</button>
                                  <button onClick={() => handleDeleteItem(item.id, dayName)} className="text-text-secondary hover:text-red-500 transition-colors">🗑️</button>
                                </div>
                           </div>
                        ) : (
                           <button onClick={() => handleGetHelpClick(item)} className="mt-3 w-full bg-accent/10 text-accent font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-2 hover:bg-accent/20 transition-colors"><span>✨</span><span>AI Помощник</span></button>
                        )}
                    </div>
                )) : (
                  <div className={`rounded-2xl text-center text-text-secondary flex items-center justify-center border-2 border-dashed border-highlight p-4 min-h-[100px] ${isAdminMode ? 'min-h-[140px]' : 'min-h-[120px]'}`}>
                    <p className="text-sm">Свободно</p>
                  </div>
                )}
                {isAdminMode && (<button onClick={() => handleOpenEditModal(null, dayName)} className="w-full bg-highlight text-text-secondary font-bold py-2 px-3 rounded-xl text-sm hover:bg-border-color transition-colors">+ Добавить пару</button>)}
              </div>
            </div>
          );
        })}
      </div>
      {isEditModalOpen && editingItem && <ScheduleEditModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} onSave={handleSaveItem} itemData={editingItem} />}
      {isHelpModalOpen && modalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"><div className="bg-secondary rounded-3xl shadow-soft-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-zoom-in border border-border-color"><div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-bold text-accent">AI Помощник</h3><button onClick={closeHelpModal} className="text-text-secondary hover:text-accent text-2xl">❌</button></div><div className="mb-4"><p className="font-semibold text-text-secondary">Ваш вопрос по предмету "{modalContent.subject}":</p><p className="p-3 bg-highlight rounded-xl mt-2 text-text-primary">{modalContent.homework}</p></div><button onClick={fetchAiHelp} disabled={isHelpLoading} className="w-full bg-accent text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-accent-hover transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">{isHelpLoading ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Генерация...</span></>) : (<><span className="text-lg">✨</span><span>Получить объяснение</span></>)}</button>{helpError && <p className="text-red-500 mt-4 text-center">{helpError}</p>}{aiHelpResponse && <div className="mt-6 p-4 bg-highlight rounded-xl"><h4 className="text-lg font-semibold text-accent mb-2">Ответ AI:</h4><div className="text-text-primary whitespace-pre-wrap">{aiHelpResponse}</div></div>}</div></div>
      )}
       {isPlanModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"><div className="bg-secondary rounded-3xl shadow-soft-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-zoom-in border border-border-color"><div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-bold text-accent">📝 AI Планировщик Учебы</h3><button onClick={closePlanModal} className="text-text-secondary hover:text-accent text-2xl">❌</button></div><div className="mb-4"><p className="font-semibold text-text-secondary">AI создаст план на основе важных задач на {activeWeek === 1 ? 'Первой' : 'Второй'} неделе:</p><ul className="list-disc pl-5 p-3 bg-highlight rounded-xl mt-2 text-text-primary">{scheduleData.flatMap(d => d.classes).filter(i => i.isImportant).length > 0 ? (scheduleData.flatMap(d => d.classes).filter(i => i.isImportant).map((item) => (<li key={item.id}><strong>{item.subject}:</strong> {item.homework}</li>))) : (<li>На этой неделе нет важных заданий. Отличное время для повторения!</li>)}</ul></div><button onClick={fetchStudyPlan} disabled={isPlanLoading} className="w-full bg-accent text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-accent-hover transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">{isPlanLoading ? (<><span>Составляю план...</span></>) : (<><span className="text-lg">🧠</span><span>Создать учебный план</span></>)}</button>{planError && <p className="text-red-500 mt-4 text-center">{planError}</p>}{aiPlanResponse && <div className="mt-6 p-4 bg-highlight rounded-xl"><h4 className="text-lg font-semibold text-accent mb-2">Ваш персональный план:</h4><div className="text-text-primary whitespace-pre-wrap prose prose-sm max-w-none">{aiPlanResponse}</div></div>}</div></div>
      )}
      {isSummaryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"><div className="bg-secondary rounded-3xl shadow-soft-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-zoom-in border border-border-color"><div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-bold text-accent">📊 Сводка на {activeWeek === 1 ? 'Первую' : 'Вторую'} неделю</h3><button onClick={closeSummaryModal} className="text-text-secondary hover:text-accent text-2xl">❌</button></div><p className="mb-4 text-text-secondary">AI проанализирует ваше расписание и выделит самое главное.</p><button onClick={fetchWeekSummary} disabled={isSummaryLoading} className="w-full bg-accent text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-accent-hover transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">{isSummaryLoading ? (<><span>Генерирую сводку...</span></>) : (<><span className="text-lg">💡</span><span>Получить сводку</span></>)}</button>{summaryError && <p className="text-red-500 mt-4 text-center">{summaryError}</p>}{aiSummaryResponse && <div className="mt-6 p-4 bg-highlight rounded-xl"><h4 className="text-lg font-semibold text-accent mb-2">Ключевые моменты недели:</h4><div className="text-text-primary whitespace-pre-wrap prose prose-sm max-w-none">{aiSummaryResponse}</div></div>}</div></div>
      )}
    </div>
  );
};

const ScheduleEditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ScheduleItem | Omit<ScheduleItem, 'id'>, day: string) => void;
  itemData: { item: ScheduleItem | Omit<ScheduleItem, 'id'>, day: string };
}> = ({ isOpen, onClose, onSave, itemData }) => {
  const [formData, setFormData] = useState(itemData.item);
  const isNew = !('id' in formData);

  useEffect(() => {
    setFormData(itemData.item);
  }, [itemData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    setFormData(prev => ({...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, itemData.day);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"><div className="bg-secondary rounded-3xl shadow-soft-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-zoom-in border border-border-color"><div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-bold text-accent">{isNew ? 'Добавить пару' : 'Редактировать пару'}</h3><button onClick={onClose} className="text-text-secondary hover:text-accent text-2xl">❌</button></div><form onSubmit={handleSubmit} className="space-y-4"><div><label className="text-sm font-bold text-text-secondary">Предмет</label><input type="text" name="subject" value={formData.subject} onChange={handleChange} className="w-full bg-highlight border-none text-text-primary p-2.5 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-accent" required /></div><div><label className="text-sm font-bold text-text-secondary">Время (напр. 9:00 - 10:30)</label><input type="text" name="time" value={formData.time} onChange={handleChange} className="w-full bg-highlight border-none text-text-primary p-2.5 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-accent" required /></div><div><label className="text-sm font-bold text-text-secondary">Аудитория</label><input type="text" name="classroom" value={formData.classroom} onChange={handleChange} className="w-full bg-highlight border-none text-text-primary p-2.5 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-accent" required /></div><div><label className="text-sm font-bold text-text-secondary">Преподаватель</label><input type="text" name="teacher" value={formData.teacher} onChange={handleChange} className="w-full bg-highlight border-none text-text-primary p-2.5 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-accent" required /></div><div><label className="text-sm font-bold text-text-secondary">Домашнее задание</label><textarea name="homework" value={formData.homework} onChange={handleChange} rows={3} className="w-full bg-highlight border-none text-text-primary p-2.5 rounded-xl mt-1 focus:outline-none focus:ring-2 focus:ring-accent" required ></textarea></div><div className="flex items-center"><input type="checkbox" name="isImportant" id="isImportant" checked={formData.isImportant} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" /><label htmlFor="isImportant" className="ml-2 text-sm text-text-primary">Это важное задание</label></div><button type="submit" className="w-full bg-accent text-white font-bold py-3 px-4 rounded-xl hover:bg-accent-hover transition-colors shadow-soft">Сохранить</button></form></div></div>
  )
};
export default Schedule;