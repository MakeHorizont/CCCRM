
import { ProductionOrder, ProductionOrderItem, User } from '../../types';
import { mockProductionOrders } from '../mockData/productionOrders';
import { mockWarehouseItems } from '../mockData/warehouseItems';
import { mockWarehouseIncidents } from '../mockData/warehouseIncidents';
import { MOCK_USERS } from '../mockData/users';
import { mockDiscussions } from '../mockData/discussions';
import { delay, deepCopy } from './utils';

const getProductionVolumeTrend = async (days = 30): Promise<any[]> => {
    await delay(500);
    const results = [];
    const today = new Date();
    
    for (let i = days; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Logical mock data: some variability but consistent trend
        const base = 450 + (Math.sin(i * 0.5) * 100);
        results.push({
            date: dateStr,
            planned: Math.round(base + 50),
            produced: Math.round(base + (Math.random() * 40 - 20))
        });
    }
    return results;
};

const getProductEfficiencyAnalysis = async (): Promise<any[]> => {
    await delay(400);
    return [
        { productId: 'TMP001', productName: 'Темпе Классический', totalProduced: 1250, avgBatchEfficiency: 98 },
        { productId: 'TMP004', productName: 'Темпе Нут', totalProduced: 840, avgBatchEfficiency: 94 },
        { productId: 'CHIP002', productName: 'Темпе-Чипсы Копченые', totalProduced: 2100, avgBatchEfficiency: 99 },
        { productId: 'TMP003', productName: 'Темпе Гречка', totalProduced: 620, avgBatchEfficiency: 92 }
    ];
};

const getUnitCostTrend = async (productId: string): Promise<any[]> => {
    await delay(600);
    const today = new Date();
    const trend = [];
    for (let i = 12; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i * 3); // Every 3 days
        trend.push({
            date: d.toISOString().split('T')[0],
            batchName: `Batch #${100 - i}`,
            unitCost: 145 + (Math.random() * 10 - 5)
        });
    }
    return trend;
};

const getLaborStats = async (): Promise<any> => {
    await delay(600);
    const trends = [
        { month: 'Июль', avgKtu: 1.05, safetyIncidents: 2, rationalizationCount: 4 },
        { month: 'Авг', avgKtu: 1.10, safetyIncidents: 1, rationalizationCount: 6 },
        { month: 'Сент', avgKtu: 1.02, safetyIncidents: 0, rationalizationCount: 3 },
        { month: 'Окт', avgKtu: 1.08, safetyIncidents: 1, rationalizationCount: 8 },
        { month: 'Ноя', avgKtu: 1.15, safetyIncidents: 0, rationalizationCount: 12 },
        { month: 'Дек', avgKtu: 1.12, safetyIncidents: 1, rationalizationCount: 7 }
    ];
    const topRationalizers = [
        { id: 'user3', name: 'Сергей Смирнов', acceptedProposals: 5, totalEconomy: 125000 },
        { id: 'user2', name: 'Кораблева Ульяна', acceptedProposals: 3, totalEconomy: 45000 }
    ];
    return { trends, topRationalizers };
};

export const analyticsService = {
    getProductionVolumeTrend,
    getProductEfficiencyAnalysis,
    getUnitCostTrend,
    getLaborStats,
};
