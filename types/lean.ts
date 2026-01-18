
export interface ValueStreamStage {
    id: string;
    name: string;
    type: 'process' | 'inventory' | 'transport';
    valueAddedTime: number; // minutes
    nonValueAddedTime: number; // minutes (waiting)
    inventoryCount?: number;
    efficiency: number; // %
}

export interface LossCategory {
    category: string; // e.g., "Брак", "Ожидание", "Лишние движения"
    amount: number; // Financial loss
    occurrences: number; // Count
    description: string;
}

export interface OEEMetric {
    equipmentId: string;
    equipmentName: string;
    availability: number; // %
    performance: number; // %
    quality: number; // %
    overall: number; // %
}

export interface LeanDashboardData {
    valueStream: ValueStreamStage[];
    losses: LossCategory[];
    oee: OEEMetric[];
    totalCycleTime: number;
    processEfficiency: number;
}
