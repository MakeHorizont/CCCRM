
import { QualityCheck } from '../../types';
import { generateId } from '../../utils/idGenerators';

export let mockQualityChecks: QualityCheck[] = [
    {
        id: 'qc-1',
        checkNumber: 'QC-2310-001',
        type: 'final',
        status: 'passed',
        relatedEntityId: 'PO-001',
        relatedEntityType: 'ProductionOrder',
        relatedEntityName: 'Партия Темпе Классического #101',
        inspectorId: 'user3',
        inspectorName: 'Сергей Смирнов',
        date: '2024-07-29T10:00:00Z',
        completedAt: '2024-07-29T10:45:00Z',
        notes: 'Партия отличного качества. Мицелий плотный, белый.',
        parameters: [
            { id: 'qp-1', name: 'Внешний вид', normativeValue: 'Равномерный белый мицелий', actualValue: 'Соответствует', isCritical: true, passed: true },
            { id: 'qp-2', name: 'Запах', normativeValue: 'Грибной, приятный', actualValue: 'Грибной', isCritical: true, passed: true },
            { id: 'qp-3', name: 'Температура внутри блока', normativeValue: '< 40°C', actualValue: '32°C', isCritical: true, passed: true },
            { id: 'qp-4', name: 'Вес упаковки', normativeValue: '250г +/- 5г', actualValue: '253г (среднее)', isCritical: false, passed: true },
        ]
    },
    {
        id: 'qc-2',
        checkNumber: 'QC-2310-002',
        type: 'incoming',
        status: 'failed',
        relatedEntityId: 'PR-001', // Assuming relation to Purchase Request or specific delivery
        relatedEntityType: 'PurchaseRequest',
        relatedEntityName: 'Поставка Сои от 24.07',
        inspectorId: 'user3',
        inspectorName: 'Сергей Смирнов',
        date: '2024-07-24T09:00:00Z',
        completedAt: '2024-07-24T09:30:00Z',
        notes: 'Обнаружены посторонние примеси и повышенная влажность.',
        generatedIncidentId: 'inc-1', // Linked to mockWarehouseIncidents
        parameters: [
            { id: 'qp-5', name: 'Влажность', normativeValue: '< 12%', actualValue: '15%', isCritical: true, passed: false },
            { id: 'qp-6', name: 'Сорность', normativeValue: '< 1%', actualValue: '3%', isCritical: true, passed: false },
        ]
    },
    {
        id: 'qc-3',
        checkNumber: 'QC-2310-003',
        type: 'production',
        status: 'pending',
        relatedEntityId: 'PO-002',
        relatedEntityType: 'ProductionOrder',
        relatedEntityName: 'Партия Чипсов Копченых #55',
        inspectorId: 'user3',
        inspectorName: 'Сергей Смирнов',
        date: new Date().toISOString(), // Scheduled for today
        parameters: [
            { id: 'qp-7', name: 'Равномерность нарезки', normativeValue: '2-3 мм', isCritical: false },
            { id: 'qp-8', name: 'Прожарка', normativeValue: 'Золотистый цвет', isCritical: true },
            { id: 'qp-9', name: 'Вкус специй', normativeValue: 'Сбалансированный', isCritical: true },
        ]
    }
];
