import { GoogleGenAI, Chat, Type } from "@google/genai";
import type { GameState, PlayerActions } from "../types";

// Инициализация клиента Google GenAI.
// Ключ API должен быть доступен через process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Генерирует текстовый контент на основе предоставленного промпта.
 * Используется для общих задач, таких как помощь с домашним заданием.
 * @param {string} prompt - Текстовый промпт для модели.
 * @returns {Promise<string>} Сгенерированный текстовый ответ.
 * @throws {Error} Если не удалось получить ответ от AI.
 */
export const generateHomeworkHelp = async (prompt: string): Promise<string> => {
  try {
    // Согласно руководству, используем ai.models.generateContent.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    // Прямой доступ к тексту ответа через свойство .text.
    return response.text;
  } catch (error) {
    console.error("Ошибка при генерации контента:", error);
    throw new Error("Не удалось сгенерировать контент от AI.");
  }
};

/**
 * Создает и возвращает новую сессию чата с Gemini.
 * @returns {Chat} Объект сессии чата.
 */
export const getChat = (): Chat => {
  // Согласно руководству, используем ai.chats.create.
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
        // Системная инструкция задает контекст для AI.
        systemInstruction: 'Ты — полезный AI-ассистент для студента. Будь кратким, дружелюбным и помогай по делу.',
    },
  });
  return chat;
};

/**
 * Обращается к AI-модели, выступающей в роли ведущего игры "Мафия".
 * @param {GameState} gameState - Текущее состояние игры.
 * @param {PlayerActions} playerActions - Действия, совершенные игроками в текущей фазе.
 * @returns {Promise<Partial<GameState>>} Промис, который разрешается объектом с изменениями для состояния игры.
 * @throws {Error} Если не удалось получить ответ от AI или распарсить его.
 */
export const getMafiaHostResponse = async (gameState: GameState, playerActions: PlayerActions): Promise<Partial<GameState>> => {
  const prompt = `
    Ты — ведущий игры "Мафия". Твой стиль — загадочный, увлекательный и очень дружелюбный. Ты рассказываешь историю.
    
    Вот текущее состояние игры в формате JSON:
    ${JSON.stringify(gameState)}

    Вот последние действия игроков:
    ${JSON.stringify(playerActions)}

    Твоя задача — обработать действия и продвинуть игру на следующий шаг.
    1. Расскажи, что произошло, основываясь на действиях игроков и фазе игры.
    2. Определи, кто был убит, спасен или изгнан.
    3. Обнови статусы игроков.
    4. Определи новую фазу игры.
    5. Проверь условия победы (Мафия побеждает, если их число равно или больше числа мирных; Мирные побеждают, если вся мафия уничтожена).

    Твой ответ ДОЛЖЕН БЫТЬ строго в формате JSON. Не добавляй ничего лишнего до или после JSON.
    Пример структуры ответа:
    {
      "narration": "Твой увлекательный рассказ о произошедших событиях.",
      "log": [{ "type": "narration", "text": "Ключевое событие, например, 'Мафия сделала свой выбор.'" }],
      "players": [
        { "telegramId": 12345, "isAlive": false },
        { "telegramId": 67890, "isAlive": true }
      ],
      "phase": "day",
      "winner": null
    }
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    narration: { type: Type.STRING },
                    log: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                type: { type: Type.STRING },
                                text: { type: Type.STRING }
                            }
                        }
                    },
                    players: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                telegramId: { type: Type.NUMBER },
                                isAlive: { type: Type.BOOLEAN }
                            }
                        }
                    },
                    phase: { type: Type.STRING },
                    winner: { type: Type.STRING, nullable: true }
                }
            }
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Ошибка при получении ответа от AI-ведущего:", error);
    // Возвращаем объект с сообщением об ошибке, чтобы игра могла его обработать.
    return {
        narration: "Произошла техническая заминка... Ведущий на секунду задумался. Попробуем еще раз.",
        log: [{ type: 'system', text: "Ошибка связи с AI. Пожалуйста, попробуйте совершить действие еще раз." }]
    };
  }
};