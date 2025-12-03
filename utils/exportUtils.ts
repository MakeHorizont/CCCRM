import { systemService } from '../services/api/systemService';

export const downloadCSV = async (data: any[], filename: string, logAction?: string) => {
    if (!data || !data.length) {
        alert("Нет данных для экспорта.");
        return;
    }

    // Helper to escape CSV values
    const escapeCSV = (str: string | number | null | undefined) => {
        if (str === null || str === undefined) return '';
        const stringValue = String(str);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    // Get headers from the first object
    const headers = Object.keys(data[0]);
    
    // Construct CSV content
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(row => headers.map(fieldName => escapeCSV(row[fieldName])).join(','))
    ];
    
    const csvString = csvRows.join('\r\n');

    // Add BOM for Excel to recognize UTF-8 (EF BB BF)
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    // Audit Log (Security Requirement)
    if (logAction) {
        try {
            await systemService.logEvent(
                'Экспорт данных',
                `Выгружен файл "${filename}" (${data.length} записей). Контекст: ${logAction}`,
                'security',
                'export',
                'CSV'
            );
        } catch (e) {
            console.error("Failed to log export event", e);
        }
    }
};