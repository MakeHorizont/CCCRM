// services/api/charterService.ts
import { charterContent, modernizationContent } from '../mockData/charter';
import { delay } from './utils';

const getCharterContent = async (): Promise<string> => {
    await delay(200);
    return charterContent;
};

const getModernizationContent = async (): Promise<string> => {
    await delay(200);
    return modernizationContent;
};

export const charterService = {
    getCharterContent,
    getModernizationContent,
};
