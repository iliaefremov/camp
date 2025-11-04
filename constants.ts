
import type { DaySchedule, Achievement, SubjectGrade } from './types';

let idCounter = 1;

export const SCHEDULE_WEEK_1: DaySchedule[] = [
  {
    day: 'Понедельник',
    classes: [
      { id: idCounter++, subject: 'Машинное обучение', time: '9:00 - 10:30', classroom: 'Ауд. 301', teacher: 'Проф. Иванов', homework: 'Прочитать главу 3, подготовить отчет по классификации.', isImportant: true },
      { id: idCounter++, subject: 'Веб-разработка', time: '10:45 - 12:15', classroom: 'Ауд. 215', teacher: 'Доц. Петров', homework: 'Завершить React компонент для дашборда.', isImportant: false },
    ]
  },
  {
    day: 'Вторник',
    classes: [
      { id: idCounter++, subject: 'Базы данных', time: '13:00 - 14:30', classroom: 'Ауд. 112', teacher: 'Проф. Сидорова', homework: 'Оптимизировать SQL-запрос для отчета.', isImportant: false },
    ]
  },
  {
    day: 'Среда',
    classes: [
       { id: idCounter++, subject: 'Машинное обучение', time: '9:00 - 10:30', classroom: 'Ауд. 301', teacher: 'Проф. Иванов', homework: 'Лабораторная работа №2.', isImportant: true },
    ]
  },
  {
    day: 'Четверг',
    classes: [
      { id: idCounter++, subject: 'Веб-разработка', time: '10:45 - 12:15', classroom: 'Ауд. 215', teacher: 'Доц. Петров', homework: 'Code review товарища.', isImportant: false },
    ]
  },
  {
    day: 'Пятница',
    classes: [
       { id: idCounter++, subject: 'Базы данных', time: '13:00 - 14:30', classroom: 'Ауд. 112', teacher: 'Проф. Сидорова', homework: 'Спроектировать схему для нового проекта.', isImportant: true },
    ]
  },
];

export const SCHEDULE_WEEK_2: DaySchedule[] = [
    {
      day: 'Понедельник',
      classes: [
        { id: idCounter++, subject: 'Анализ данных', time: '9:00 - 10:30', classroom: 'Ауд. 305', teacher: 'Проф. Кузнецов', homework: 'Провести EDA на новом датасете.', isImportant: true },
      ]
    },
    {
      day: 'Вторник',
      classes: [
        { id: idCounter++, subject: 'Компьютерные сети', time: '10:45 - 12:15', classroom: 'Ауд. 404', teacher: 'Доц. Смирнов', homework: 'Настроить виртуальную сеть в Packet Tracer.', isImportant: false },
      ]
    },
    {
      day: 'Среда',
      classes: []
    },
    {
      day: 'Четверг',
      classes: [
        { id: idCounter++, subject: 'Безопасность систем', time: '13:00 - 14:30', classroom: 'Ауд. 101', teacher: 'Проф. Васильев', homework: 'Написать эссе о методах шифрования.', isImportant: true },
      ]
    },
     {
      day: 'Пятница',
      classes: [
        { id: idCounter++, subject: 'Анализ данных', time: '9:00 - 10:30', classroom: 'Ауд. 305', teacher: 'Проф. Кузнецов', homework: 'Подготовка к презентации проекта.', isImportant: false },
      ]
    },
];

export const GRADES_DATA: SubjectGrade[] = [
  // Анатомия
  { user_id: '1', subject: 'Анатомия', topic: 'Кости черепа', date: '2024-09-15', score: 5 },
  { user_id: '1', subject: 'Анатомия', topic: 'Мышцы спины', date: '2024-09-22', score: 4 },
  { user_id: '1', subject: 'Анатомия', topic: 'Коллоквиум по ЦНС', date: '2024-10-01', score: 5 },
  { user_id: '1', subject: 'Анатомия', topic: 'Сердечно-сосудистая система', date: '2024-10-10', score: 3 },

  // Гистология
  { user_id: '1', subject: 'Гистология', topic: 'Эпителиальные ткани', date: '2024-09-18', score: 5 },
  { user_id: '1', subject: 'Гистология', topic: 'Соединительная ткань', date: '2024-09-25', score: 4 },
  { user_id: '1', subject: 'Гистология', topic: 'Практическое занятие: микроскоп', date: '2024-10-05', score: 'зачет' },
  { user_id: '1', subject: 'Гистология', topic: 'Мышечные ткани', date: '2024-10-12', score: 4 },

  // Нормальная физиология
  { user_id: '1', subject: 'Нормальная физиология', topic: 'Возбудимые ткани', date: '2024-09-20', score: 5 },
  { user_id: '1', subject: 'Нормальная физиология', topic: 'Физиология дыхания', date: '2024-09-27', score: 5 },
  { user_id: '1', subject: 'Нормальная физиология', topic: 'Работа сердца', date: '2024-10-08', score: 4 },
];


export const ACHIEVEMENTS_DEFINITIONS: Omit<Achievement, 'unlocked'>[] = [
    { id: 'excellent', title: 'Отличник', description: 'Получить 3 или более оценок "5".', emoji: '🏆', points: 50 },
    { id: 'consistent', title: 'Стабильность', description: 'Не иметь оценок ниже "4".', emoji: '🎯', points: 30 },
    { id: 'progress', title: 'Прогресс', description: 'Улучшить свою оценку по предмету.', emoji: '📈', points: 25 },
];
