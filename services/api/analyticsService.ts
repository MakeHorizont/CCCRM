
import { ProductionOrder, ProductionOrderItem, User } from '../../types';
import { mockProductionOrders } from '../mockData/productionOrders';
import { mockWarehouseItems } from '../mockData/warehouseItems';
import { mockWarehouseIncidents } from '../mockData/warehouseIncidents';
import { MOCK_USERS } from '../mockData/users';
import { mockDiscussions } from '../mockData/discussions';
import { delay, deepCopy } from './utils';

interface ProductionTrend {
    date: string;
    planned: number;
    produced: number;
}

interface CostTrend {
    date: string;
    batchName: string;
    unitCost: number;
}

interface ProductEfficiency {
    productId: string;
    productName: string;
    totalProduced: number;
    avgBatchEfficiency: number; // produced / planned %
}

interface LaborTrend {
    month: string;
    avgKtu: number;
    safetyIncidents: number;
    rationalizationCount: number;
}

interface TopRationalizer {
    id: string;
    name: string;
    acceptedProposals: number;
    totalEconomy: number;
}

const getProductionVolumeTrend = async (days = 30): Promise<ProductionTrend[]> => {
    await delay(500);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trendMap = new Map<string, { planned: number, produced: number }>();
    
    // Init map
    for(let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        trendMap.set(d.toISOString().split('T')[0], { planned: 0, produced: 0 });
    }

    mockProductionOrders.forEach(po => {
        if (po.isArchived || po.status === 'Отменено') return;
        
        // Map planned items to plannedStartDate (or createdAt)
        const planDate = (po.plannedStartDate || po.createdAt).split('T')[0];
        if (trendMap.has(planDate)) {
            const entry = trendMap.get(planDate)!;
            const plannedTotal = po.orderItems.reduce((sum, item) => sum + item.plannedQuantity, 0);
            trendMap.set(planDate, { ...entry, planned: entry.planned + plannedTotal });
        }

        // Map produced items to actualEndDate (or updatedAt if completed)
        if (po.status === 'Завершено' && po.actualEndDate) {
            const actualDate = po.actualEndDate.split('T')[0];
            if (trendMap.has(actualDate)) {
                 const entry = trendMap.get(actualDate)!;
                 const producedTotal = po.orderItems.reduce((sum, item) => sum + (item.producedQuantity || 0), 0);
                 trendMap.set(actualDate, { ...entry, produced: entry.produced + producedTotal });
            }
        }
    });

    return Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        planned: data.planned,
        produced: data.produced
    })).sort((a,b) => a.date.localeCompare(b.date));
};

const getProductEfficiencyAnalysis = async (): Promise<ProductEfficiency[]> => {
    await delay(400);
    const productStats = new Map<string, { name: string, totalPlanned: number, totalProduced: number, batchCount: number }>();

    mockProductionOrders.forEach(po => {
        if (po.isArchived || po.status === 'Отменено') return;
        
        po.orderItems.forEach(item => {
            if (!productStats.has(item.warehouseItemId)) {
                productStats.set(item.warehouseItemId, { name: item.productName, totalPlanned: 0, totalProduced: 0, batchCount: 0 });
            }
            const entry = productStats.get(item.warehouseItemId)!;
            entry.totalPlanned += item.plannedQuantity;
            entry.totalProduced += (item.producedQuantity || 0);
            entry.batchCount += 1;
        });
    });

    return Array.from(productStats.entries()).map(([id, data]) => ({
        productId: id,
        productName: data.name,
        totalProduced: data.totalProduced,
        avgBatchEfficiency: data.totalPlanned > 0 ? Math.round((data.totalProduced / data.totalPlanned) * 100) : 0
    })).sort((a,b) => b.totalProduced - a.totalProduced);
};

const getUnitCostTrend = async (productId: string): Promise<CostTrend[]> => {
    await delay(600);
    // Find all completed POs that included this product
    const completedPOs = mockProductionOrders.filter(po => 
        po.status === 'Завершено' && 
        po.totalCalculatedCost !== undefined &&
        po.orderItems.some(item => item.warehouseItemId === productId)
    );

    return completedPOs.map(po => {
        const item = po.orderItems.find(i => i.warehouseItemId === productId);
        // Simple allocation logic: cost distributed by item count weight? 
        // For simplicity in this MVP: Assume single-product PO or equal distribution per unit.
        // More precise logic would require tracking cost per item in PO.
        // Let's approximate: (Total PO Cost / Total Items in PO) * this item quantity / this item produced quantity
        
        const totalItemsProduced = po.orderItems.reduce((sum, i) => sum + (i.producedQuantity || 0), 0);
        const avgCostPerUnitInBatch = totalItemsProduced > 0 ? (po.totalCalculatedCost! / totalItemsProduced) : 0;

        return {
            date: (po.actualEndDate || po.updatedAt).split('T')[0],
            batchName: po.name,
            unitCost: parseFloat(avgCostPerUnitInBatch.toFixed(2))
        };
    }).sort((a,b) => a.date.localeCompare(b.date));
};

const getLaborStats = async (): Promise<{ trends: LaborTrend[], topRationalizers: TopRationalizer[] }> => {
    await delay(600);
    
    // 1. Calculate Trends (Mocking last 6 months)
    const trends: LaborTrend[] = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthName = d.toLocaleDateString('ru-RU', { month: 'short' });
        
        // Fake data generation based on mock events/users to look realistic
        // In real app, this queries aggregated historical tables
        
        // KTU: Average of current users (with some random variance for history)
        const avgKtuBase = MOCK_USERS.reduce((sum, u) => sum + (u.currentMonthKTU?.total || 1.0), 0) / MOCK_USERS.length;
        const variance = (Math.random() - 0.5) * 0.2;
        
        // Safety: Count incidents in that month
        const incidentsCount = mockWarehouseIncidents.filter(inc => {
            const incDate = new Date(inc.timestamp);
            return incDate.getMonth() === d.getMonth() && incDate.getFullYear() === d.getFullYear() && (inc.type === 'damage' || inc.type === 'defect');
        }).length;

        // Rationalization: Count topics created
        const ratCount = mockDiscussions.filter(t => {
            const tDate = new Date(t.createdAt);
            return t.type === 'rationalization' && tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear();
        }).length;

        trends.push({
            month: monthName,
            avgKtu: parseFloat((avgKtuBase + variance).toFixed(2)),
            safetyIncidents: incidentsCount,
            rationalizationCount: ratCount
        });
    }

    // 2. Top Rationalizers
    const rationalizersMap = new Map<string, TopRationalizer>();
    mockDiscussions.forEach(t => {
        if (t.type === 'rationalization' && t.rationalization?.status === 'implemented') {
            if (!rationalizersMap.has(t.authorId)) {
                rationalizersMap.set(t.authorId, { id: t.authorId, name: t.authorName || 'Unknown', acceptedProposals: 0, totalEconomy: 0 });
            }
            const entry = rationalizersMap.get(t.authorId)!;
            entry.acceptedProposals++;
            entry.totalEconomy += (t.rationalization.actualEconomy || 0);
        }
    });

    const topRationalizers = Array.from(rationalizersMap.values()).sort((a, b) => b.totalEconomy - a.totalEconomy);

    return { trends, topRationalizers };
};

export const analyticsService = {
    getProductionVolumeTrend,
    getProductEfficiencyAnalysis,
    getUnitCostTrend,
    getLaborStats,
};
