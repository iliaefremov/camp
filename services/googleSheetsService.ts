import type { SubjectGrade } from '../types';

// --- Конфигурация для настоящего Google Sheets API ---
// 1. Я вставил ID вашей таблицы.
// 2. Убедитесь, что ваша таблица опубликована в интернете (Файл > Поделиться > Опубликовать в интернете).
// 3. ВАЖНО: Вам нужно создать API-ключ в Google Cloud Console и вставить его вместо 'YOUR_GOOGLE_API_KEY_HERE'.
//    Без этого ключа запросы работать не будут. Инструкции можно найти в интернете по запросу "Google Sheets API key".

const SHEET_ID = '1kH7IKltlEfS9c1r_O6jZeGtOKfaTRXgFo2Lo3RBoIRw';
const RANGE = 'Sheet1!A2:E'; // Диапазон A2:E для ваших данных.
const API_KEY = 'AIzaSyCKsIKjT0Z6xojyKZIaaQrTuma2ivtuE1k'; // <-- ЗАМЕНИТЕ ЭТО НА ВАШ КЛЮЧ

const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

/**
 * Получает и парсит данные об оценках из вашей Google Таблицы.
 * @returns {Promise<SubjectGrade[]>} Массив оценок.
 */
export const getGrades = async (): Promise<SubjectGrade[]> => {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
        const errorData = await response.json();
        // Улучшенное логирование для отладки
        console.error("Google Sheets API Error:", JSON.stringify(errorData, null, 2));
        // Извлекаем более конкретное сообщение об ошибке
        const apiErrorMessage = errorData?.error?.message || 'Проверьте правильность ID таблицы, API-ключа и убедитесь, что таблица опубликована.';
        throw new Error(apiErrorMessage);
    }
    const data = await response.json();
    const parsedData = parseSheetData(data.values);
    return parsedData;
  } catch (error) {
    console.error("Ошибка при запросе к Google Sheets:", error);
    // Передаем ошибку дальше, чтобы компонент мог ее отобразить
    throw error;
  }
};

/**
 * Вспомогательная функция для преобразования ответа от Google Sheets API
 * (массив массивов) в типизированный массив объектов.
 * @param {string[][]} values - Данные из таблицы.
 * @returns {SubjectGrade[]} - Отформатированные данные.
 */
const parseSheetData = (values: string[][]): SubjectGrade[] => {
  if (!values || values.length === 0) return [];

  return values.map(row => {
    const [user_id, subject, topic, date, scoreStr] = row;
    
    // Преобразуем оценку в число, если это возможно, иначе оставляем строкой (для "зачета")
    const score = !isNaN(parseFloat(scoreStr)) && isFinite(Number(scoreStr)) ? Number(scoreStr) : scoreStr as 'зачет';

    return {
      user_id,
      subject,
      topic,
      date,
      score,
    };
  }).filter(grade => grade.subject && grade.user_id); // Отфильтровываем пустые строки
};