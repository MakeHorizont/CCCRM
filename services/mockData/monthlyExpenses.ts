import { MonthlyExpense } from '../../types';

// Let's add some data for the current month for testing purposes.
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth(); // 0-11
const currentMonthId = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

export let mockMonthlyExpenses: MonthlyExpense[] = [
    {
        id: currentMonthId,
        year: currentYear,
        month: currentMonth,
        rent: 66760, // Updated
        depreciation: 0, // Will be calculated dynamically
        supplies: 10000, // general supplies, not BOM
        cleaning: 12000,
        repairs: 5000,
        updatedAt: new Date().toISOString(),
        electricityPricePerKwh: 5.5,
        waterAndOtherUtilities: 5000,
        electricityCost: 18122, // This will be overwritten by live calculation, placeholder
        isClosed: false,
    },
    {
        // Example for a previous month
        id: `${currentYear}-06`,
        year: currentYear,
        month: 5, // June
        rent: 145000,
        depreciation: 25000, // Placeholder for old data
        supplies: 8000,
        cleaning: 12000,
        repairs: 0,
        updatedAt: new Date(new Date().setMonth(currentMonth - 1)).toISOString(),
        electricityPricePerKwh: 5.2,
        waterAndOtherUtilities: 4500,
        electricityCost: 17500,
        isClosed: true, // Example of a closed month
    }
];