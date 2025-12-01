
import { QualityCheck, QualityCheckStatus, QualityCheckType, QualityParameter } from '../../types';
import { mockQualityChecks } from '../mockData/qualityChecks';
import { MOCK_USERS } from '../mockData/users';
import { delay, deepCopy } from './utils';
import { generateId } from '../../utils/idGenerators';
import { authService } from '../authService';
import { systemService } from './systemService';
import { API_CONFIG } from './config';
import { apiClient } from '../apiClient';

const getQualityChecks = async (filters: { 
    status?: QualityCheckStatus, 
    type?: QualityCheckType,
    relatedEntityId?: string 
}): Promise<QualityCheck[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.QUALITY) {
        return apiClient.get<QualityCheck[]>('/quality/checks', filters);
    }

    await delay(300);
    let checks = deepCopy(mockQualityChecks);

    if (filters.status) {
        checks = checks.filter(c => c.status === filters.status);
    }
    if (filters.type) {
        checks = checks.filter(c => c.type === filters.type);
    }
    if (filters.relatedEntityId) {
        checks = checks.filter(c => c.relatedEntityId === filters.relatedEntityId);
    }

    return checks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const getQualityCheckById = async (id: string): Promise<QualityCheck | null> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.QUALITY) {
        return apiClient.get<QualityCheck>(`/quality/checks/${id}`);
    }

    await delay(200);
    const check = mockQualityChecks.find(c => c.id === id);
    return check ? deepCopy(check) : null;
};

const createQualityCheck = async (data: Omit<QualityCheck, 'id' | 'checkNumber' | 'status' | 'completedAt'>): Promise<QualityCheck> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.QUALITY) {
        return apiClient.post<QualityCheck>('/quality/checks', data);
    }

    await delay(400);
    const newCheck: QualityCheck = {
        ...data,
        id: generateId('qc'),
        checkNumber: `QC-${new Date().getFullYear()}-${mockQualityChecks.length + 101}`,
        status: 'pending',
    };
    mockQualityChecks.unshift(newCheck);
    
    await systemService.logEvent(
        'Создание проверки ОТК',
        `Назначена проверка качества ${newCheck.checkNumber} для ${newCheck.relatedEntityType} #${newCheck.relatedEntityId}`,
        'production',
        newCheck.id,
        'QualityCheck'
    );

    return deepCopy(newCheck);
};

const updateQualityCheckResult = async (id: string, resultData: { 
    status: QualityCheckStatus, 
    notes?: string, 
    parameters: { id: string, actualValue: string, passed: boolean }[] 
}): Promise<QualityCheck> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.QUALITY) {
        return apiClient.patch<QualityCheck>(`/quality/checks/${id}/result`, resultData);
    }

    await delay(500);
    const index = mockQualityChecks.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Quality Check not found");

    const user = await authService.getCurrentUser();
    const check = mockQualityChecks[index];

    check.status = resultData.status;
    check.notes = resultData.notes;
    check.inspectorId = user?.id;
    check.inspectorName = user?.name;
    check.completedAt = new Date().toISOString();

    // Update parameters
    check.parameters = check.parameters.map(p => {
        const update = resultData.parameters.find(up => up.id === p.id);
        if (update) {
            return { ...p, actualValue: update.actualValue, passed: update.passed };
        }
        return p;
    });

    mockQualityChecks[index] = check;

    await systemService.logEvent(
        'Проведение проверки ОТК',
        `Проверка ${check.checkNumber} завершена со статусом: ${check.status}. Инспектор: ${check.inspectorName}`,
        'production',
        check.id,
        'QualityCheck'
    );

    return deepCopy(check);
};

export const qualityService = {
    getQualityChecks,
    getQualityCheckById,
    createQualityCheck,
    updateQualityCheckResult,
};
