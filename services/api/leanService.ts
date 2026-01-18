
import { LeanDashboardData, ValueStreamStage, LossCategory, OEEMetric } from '../../types';
import { mockProductionOrders } from '../mockData/productionOrders';
import { mockWarehouseIncidents } from '../mockData/warehouseIncidents';
import { mockEquipment } from '../mockData/equipment';
import { mockWarehouseItems } from '../mockData/warehouseItems';
import { delay } from './utils';

const getLeanDashboardData = async (): Promise<LeanDashboardData> => {
    await delay(600);

    // 1. Calculate Value Stream Map (Simplified Model)
    // In a real app, this would analyze timestamps of every status change in ProductionOrders
    
    const activePOs = mockProductionOrders.filter(po => !po.isArchived);
    const avgCycleTime = 120; // Mock avg minutes for production
    const avgWaitTime = activePOs.filter(po => po.status === 'Ожидает сырья').length * 60 * 24; // Mock wait

    const valueStream: ValueStreamStage[] = [
        {
            id: 'suppliers',
            name: 'Поставщики',
            type: 'transport',
            valueAddedTime: 0,
            nonValueAddedTime: 2880, // 2 days lead time
            efficiency: 0
        },
        {
            id: 'raw_stock',
            name: 'Склад Сырья',
            type: 'inventory',
            valueAddedTime: 0,
            nonValueAddedTime: 1440, // 1 day inventory hold
            inventoryCount: 450, // items
            efficiency: 0
        },
        {
            id: 'production',
            name: 'Цех (Производство)',
            type: 'process',
            valueAddedTime: avgCycleTime,
            nonValueAddedTime: 60, // 1 hour setup/wait
            efficiency: (avgCycleTime / (avgCycleTime + 60)) * 100
        },
        {
            id: 'qc',
            name: 'Контроль Качества',
            type: 'process',
            valueAddedTime: 15,
            nonValueAddedTime: 30, // Queue for QC
            efficiency: 33
        },
        {
            id: 'fg_stock',
            name: 'Склад ГП',
            type: 'inventory',
            valueAddedTime: 0,
            nonValueAddedTime: 720, // 12 hours before shipping
            inventoryCount: mockWarehouseItems.reduce((acc, i) => acc + i.quantity, 0),
            efficiency: 0
        }
    ];

    const totalCycleTime = valueStream.reduce((acc, s) => acc + s.valueAddedTime + s.nonValueAddedTime, 0);
    const totalValueAdded = valueStream.reduce((acc, s) => acc + s.valueAddedTime, 0);
    const processEfficiency = Math.round((totalValueAdded / totalCycleTime) * 100);

    // 2. Calculate Losses (Muda)
    // Based on WarehouseIncidents and "Waste" in Production
    const losses: LossCategory[] = [];
    
    // Material Waste from Incidents
    const materialLoss = mockWarehouseIncidents
        .filter(i => i.type === 'damage' || i.type === 'defect')
        .length * 5000; // Mock avg cost
        
    losses.push({ category: 'Брак и Дефекты', amount: materialLoss, occurrences: mockWarehouseIncidents.length, description: 'Списания материалов и готовой продукции.' });

    // Waiting Time (Mock)
    const waitingHours = activePOs.filter(po => po.status === 'Ожидает сырья' || po.status === 'Приостановлено').length * 8;
    losses.push({ category: 'Ожидание', amount: waitingHours * 500, occurrences: activePOs.length, description: 'Простой персонала из-за отсутствия сырья.' });

    // 3. OEE Calculation
    const oee: OEEMetric[] = mockEquipment
        .filter(eq => eq.status !== 'broken') // Filter out totally broken for OEE usually
        .slice(0, 5) // Top 5 machines
        .map(eq => {
            const availability = eq.status === 'maintenance' ? 85 : 98; // Mock
            const performance = 90 + Math.random() * 10;
            const quality = 95 + Math.random() * 5;
            return {
                equipmentId: eq.id,
                equipmentName: eq.name,
                availability: Math.round(availability),
                performance: Math.round(performance),
                quality: Math.round(quality),
                overall: Math.round((availability * performance * quality) / 10000)
            };
        });

    return {
        valueStream,
        losses: losses.sort((a,b) => b.amount - a.amount),
        oee,
        totalCycleTime,
        processEfficiency
    };
};

export const leanService = {
    getLeanDashboardData
};
