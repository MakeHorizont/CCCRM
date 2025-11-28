import { GoogleGenAI, Chat } from '@google/genai';
import { delay } from './utils';

// Store the chat instance in memory to maintain conversation context for the session
let chatInstance: Chat | null = null;

const initializeChat = (): Chat => {
    if (chatInstance) {
        return chatInstance;
    }
    if (!process.env.API_KEY) {
        console.error("API_KEY for Gemini is not configured.");
        // This will allow the UI to function with a mock response if the key is missing.
        // A real-world scenario might throw a harder error.
        return null as any; 
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `Ты - полезный AI-ассистент, интегрированный в сложную ERP/CRM систему под названием CCCRM, построенную на социалистических принципах. 
Твоя цель - помогать пользователям понимать и навигировать в приложении. 
Ты осведомлен обо всех модулях: Панель управления, Контакты, Склад, Производство, Kanban, Стратегические планы, Финансы и т.д.
Твой тон - помогающий, профессиональный и слегка формальный, как у знающего коллеги. 
Ты не можешь получить доступ к реальным данным пользователя. Если пользователь запрашивает конкретные данные (например, 'Сколько у меня заказов?'), ты должен объяснить, как он может найти эту информацию самостоятельно в приложении (например, 'Чтобы увидеть ваши заказы, пожалуйста, перейдите в раздел "Заказы" в боковом меню.'), но укажи, что ты не можешь просмотреть данные за него из-за ограничений конфиденциальности и технических ограничений.
Твои ответы должны быть краткими и ясными.`;

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
    
    if (!chat) { // Mock response if API key is missing
        const mockMessage = "API-ключ для Gemini не настроен. Это имитация ответа.";
        for (const word of mockMessage.split(' ')) {
            await delay(50);
            yield { text: word + ' ' };
        }
        return;
    }
    
    const responseStream = await chat.sendMessageStream({ message: prompt });
    
    for await (const chunk of responseStream) {
        // Here we yield the text directly from the chunk
        yield { text: chunk.text };
    }
};

export const aiAssistantService = {
    getAIAssistantResponseStream,
};