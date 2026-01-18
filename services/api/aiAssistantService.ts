
import { GoogleGenAI, Chat, Type } from '@google/genai';
import { delay } from './utils';

// Store the chat instance in memory to maintain conversation context for the session
let chatInstance: Chat | null = null;

const initializeChat = (): Chat => {
    if (chatInstance) {
        return chatInstance;
    }
    if (!process.env.API_KEY) {
        console.error("API_KEY for Gemini is not configured.");
        return null as any; 
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `Ты - полезный AI-ассистент, интегрированный в сложную ERP/CRM систему под названием CCCRM, построенную на социалистических принципах. 
Твоя цель - помогать пользователям понимать и навигировать в приложении. 
Ты не можешь получить доступ к реальным данным пользователя напрямую, но ты можешь анализировать массивы данных, которые тебе передают через специализированные функции.
Твой тон - помогающий, профессиональный и слегка формальный. Ты всегда стоишь на защите интересов коллектива и эффективности производства.`;

    chatInstance = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
        },
    });

    return chatInstance;
};

const getAIAssistantResponseStream = async function* (prompt: string) {
    const chat = initializeChat();
    
    if (!chat) {
        const mockMessage = "API-ключ для Gemini не настроен. Это имитация ответа.";
        for (const word of mockMessage.split(' ')) {
            await delay(50);
            yield { text: word + ' ' };
        }
        return;
    }
    
    const responseStream = await chat.sendMessageStream({ message: prompt });
    
    for await (const chunk of responseStream) {
        yield { text: chunk.text };
    }
};

const analyzeAnomalies = async (dataContext: any): Promise<string> => {
    if (!process.env.API_KEY) return "ИИ-анализ недоступен: отсутствует API ключ.";
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Проанализируй производственные данные на предмет аномалий и неэффективности. 
Подсвети скрытые зависимости (например, связь брака с конкретным оборудованием или временем смены). 
Не давай советов по управлению персоналом, сфокусируйся на материальных и технологических факторах.

ДАННЫЕ:
${JSON.stringify(dataContext)}
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "Ты - ИИ-Сенсор предприятия. Твоя задача - находить аномалии в цифрах. Отвечай кратко, тезисно, в формате Markdown.",
            temperature: 0.4
        }
    });

    return response.text || "Аномалий не обнаружено.";
};

export const aiAssistantService = {
    getAIAssistantResponseStream,
    analyzeAnomalies,
};
