// services/api/developmentService.ts
import { DevelopmentPlanItem, TrainingCourse, TrainingApplication, PerformanceReview, User, KanbanTask, UserAchievement } from '../../types';
import { mockTrainingCourses } from '../mockData/trainingCourses';
import { MOCK_USERS } from '../mockData/users';
import { authService } from '../authService';
import { delay, deepCopy, createSystemNotification } from './utils';
import { generateId } from '../../utils/idGenerators';
import { GoogleGenAI, Type } from '@google/genai';


const getTrainingCourses = async (): Promise<TrainingCourse[]> => {
    await delay(300);
    return deepCopy(mockTrainingCourses);
};

const updateUserDevelopmentPlan = async (userId: string, plan: DevelopmentPlanItem[]): Promise<User> => {
    await delay(400);
    const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");

    const updatedUser = { ...MOCK_USERS[userIndex], developmentPlan: plan };
    authService.updateMockUser(updatedUser as User);
    return deepCopy(updatedUser as User);
};

const submitTrainingApplication = async (applicationData: Omit<TrainingApplication, 'id'|'submittedAt'|'status'>): Promise<TrainingApplication> => {
    await delay(500);
    const user = MOCK_USERS.find(u => u.id === applicationData.userId);
    if (!user) throw new Error("User not found");
    
    const newApplication: TrainingApplication = {
      ...applicationData,
      id: generateId('ta'),
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    if (!user.trainingApplications) {
      user.trainingApplications = [];
    }
    user.trainingApplications.push(newApplication);
    authService.updateMockUser(user);

    const manager = user.managerId ? MOCK_USERS.find(u => u.id === user.managerId) : MOCK_USERS.find(u => u.role === 'ceo');
    if (manager) {
      const notification = createSystemNotification(
        manager.id,
        'info',
        `Сотрудник ${user.name} подал заявку на курс: "${applicationData.courseTitle}"`,
        `/hierarchy`,
        { type: 'system', id: newApplication.id }
      );
    }

    return deepCopy(newApplication);
};

const generatePerformanceReviewDraft = async (context: {
    userName: string;
    userRole: string;
    completedTasks: string;
    positiveFeedback: string;
    challenges: string;
    collectiveGoals: string;
  }): Promise<{ strengths: string; areasForImprovement: string; goalsForNextPeriod: string; }> => {
    if (!process.env.API_KEY) {
      console.error("API_KEY for Gemini is not configured.");
      await delay(1000);
      return {
        strengths: `* Mock: Вклад в задачи, связанные с "${context.collectiveGoals || 'общими целями'}".\n* Mock: Проявлена инициатива в "${context.positiveFeedback || 'различных ситуациях'}".`,
        areasForImprovement: `* Mock: Требуется больше внимания к "${context.challenges || 'сложным задачам'}".\n* Mock: Необходимо улучшить взаимодействие с командой для достижения общих целей.`,
        goalsForNextPeriod: `* Mock: Изучить новые технологии, связанные с "${context.collectiveGoals || 'будущими проектами'}".\n* Mock: Улучшить документирование процессов.`,
      };
    }
    const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

    const systemInstruction = `Ты - опытный и справедливый руководитель-марксист на социалистическом предприятии. Твоя задача - помочь составить конструктивный отзыв (performance review) для товарища.
    Твои ответы должны быть структурированными и соответствовать JSON-схеме.
    - В "сильных сторонах" отмечай вклад в общее дело, помощь товарищам, инициативность и качественное выполнение плановых задач.
    - В "зонах роста" делай акцент не на личных недостатках, а на тех областях, где коллектив может помочь товарищу вырасти, и где его рост принесет пользу общему делу. Критика должна быть товарищеской и конструктивной.
    - В "целях" формулируй конкретные, измеримые задачи, которые помогут товарищу развить свои навыки и внести больший вклад в достижение общих стратегических целей предприятия.`;
    
    const prompt = `Проанализируй следующие данные по товарищу ${context.userName} (роль: ${context.userRole}) и сгенерируй черновик отзыва.

- Выполненные задачи и достижения за период:
${context.completedTasks || 'Не указаны'}

- Положительная обратная связь и наблюдения:
${context.positiveFeedback || 'Не указаны'}

- Трудности и моменты, требующие внимания:
${context.challenges || 'Не указаны'}

- Общие цели коллектива на следующий период:
${context.collectiveGoals || 'Не указаны'}
`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        strengths: { type: Type.STRING, description: "Анализ сильных сторон. Формат: Markdown, список." },
        areasForImprovement: { type: Type.STRING, description: "Конструктивный анализ областей для роста. Формат: Markdown, список." },
        goalsForNextPeriod: { type: Type.STRING, description: "Предлагаемые цели. Формат: Markdown, список." },
      },
      required: ["strengths", "areasForImprovement", "goalsForNextPeriod"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.5,
      }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};

export const developmentService = {
    getTrainingCourses,
    updateUserDevelopmentPlan,
    submitTrainingApplication,
    generatePerformanceReviewDraft,
};
