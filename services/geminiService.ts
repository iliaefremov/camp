import { GoogleGenAI, Chat, Type } from "@google/genai";
import type { GameState } from '../types';

// Always use new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates content based on a prompt.
 * @param prompt The text prompt to send to the model.
 * @returns The generated text response.
 */
export const generateHomeworkHelp = async (prompt: string): Promise<string> => {
  try {
    // Per guidelines, use ai.models.generateContent
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    // Per guidelines, access text directly from response.text
    return response.text;
  } catch (error) {
    console.error("Error generating content:", error);
    throw new Error("Failed to generate content from AI.");
  }
};

/**
 * Creates and returns a new chat session.
 * @returns A Chat session object.
 */
export const getChat = (): Chat => {
  // Per guidelines, use ai.chats.create
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    // System instruction could be added here if needed, for now it's a general chat.
    config: {
        systemInstruction: 'You are a helpful AI assistant for a student. Be concise and helpful.',
    },
  });
  return chat;
};

/**
 * Runs the AI logic for the Mafia game.
 * @param gameState The current state of the game.
 * @param userAction The action taken by the user.
 * @returns A JSON string with the AI's response and game updates.
 */
// FIX: Update return type to include the prompt for history tracking.
export const runMafiaLogic = async (gameState: GameState, userAction: { type: string; payload?: any } | null): Promise<{responseText: string, promptForHistory: string}> => {
  const model = 'gemini-2.5-pro'; // Use a more powerful model for game logic

  const { players, phase, dayNumber, history } = gameState;
  const livingPlayers = players.filter(p => p.isAlive);
  const userPlayer = players.find(p => p.isUser);

  let userActionPrompt = userAction ? `The user action is: ${JSON.stringify(userAction)}.` : 'It is the start of a new phase.';

  let prompt = `You are the Game Master for a text-based game of Mafia.
  Your responses must be in Russian. Your output must be a valid JSON object matching the provided schema.
  
  Game State:
  - Day Number: ${dayNumber}
  - Current Phase: ${phase}
  - Living Players: ${livingPlayers.map(p => `${p.name} (isUser: ${p.isUser})`).join(', ')}
  - User's Role: ${userPlayer?.role}

  Task:
  Based on the current phase, advance the game. Create a suspenseful narrative.
  ${userActionPrompt}
  `;

  if (phase === 'night') {
    prompt += `
    It is night. The Mafia must choose a victim. The Doctor must choose someone to save.
    Simulate these actions secretly. The Mafia cannot kill another Mafia member. The Doctor can save anyone, including themself.
    Determine the outcome and write a compelling narration for the start of the next day. Announce who was killed, if anyone.
    If the Doctor saved the victim, announce that the Mafia's attempt failed without revealing who was saved.
    `;
  } else if (phase === 'day') {
    prompt += `
    It is daytime. The players must discuss and vote to eliminate one person.
    Based on the user's vote, simulate the votes of the other AI players. Make their votes plausible based on a hidden logic.
    Determine who is voted out. Write a narration of the discussion and the final vote, revealing the eliminated player's role.
    `;
  }
  
  try {
    // FIX: The 'history' parameter is not valid. Conversation history must be passed within the 'contents' array.
    const response = await ai.models.generateContent({
      model: model,
      contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narration: { type: Type.STRING, description: 'Narrative text describing what happened.' },
            killedId: { type: Type.NUMBER, description: 'ID of the player killed by the Mafia.', nullable: true },
            savedId: { type: Type.NUMBER, description: 'ID of the player saved by the Doctor.', nullable: true },
            votedOutId: { type: Type.NUMBER, description: 'ID of the player voted out by the town.', nullable: true },
            winner: { type: Type.STRING, description: 'Declare a winner if the game is over ("Mafia" or "Civilians").', nullable: true },
          },
        },
      },
    });
    // FIX: Return both the response text and the prompt used, for accurate history tracking.
    return { responseText: response.text, promptForHistory: prompt };
  } catch (error) {
    console.error("Error with Mafia AI logic:", error);
    throw new Error("The Game Master is confused. Please try again.");
  }
};