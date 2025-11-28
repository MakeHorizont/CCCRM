import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import { Document as DocumentType, DocumentType as DocTypeEnum } from '../../types';
import { apiService } from '../../services/apiService';
import {
    DocumentChartBarIcon, MagnifyingGlassIcon, FunnelIcon, TableCellsIcon, PrinterIcon, ChevronUpIcon, ChevronDownIcon, ArrowsUpDownIcon
} from '../UI/Icons';
import { ROUTE_PATHS, DOCUMENT_TYPE_COLOR_MAP } from '../../constants';
import { useView } from '../../hooks/useView';
import { Link } from 'react-router-dom';

type SortableKeys = 'number' | 'date' | 'totalAmount' | 'customerName' | 'type';
type SortDirection = 'asc' | 'desc';
type DocumentWithCustomer = DocumentType & { customerName: string };

const MobileDocumentCard: React.FC<{ doc: DocumentWithCustomer }> = ({ doc }) => {
    const handlePrint = () => {
        window.open(`${ROUTE_PATHS.PRINT_DOCUMENT}/${doc.id}`, '_blank');
    };
    
    return (
        <Card className="mb-3" onClick={handlePrint}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-semibold text-brand-text-primary">{doc.type === 'invoice' ? 'Счет' : 'Накладная'} № {doc.number}</h3>
                    <p className="text-xs text-brand-text-muted">от {new Date(doc.date).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${DOCUMENT_TYPE_COLOR_MAP[doc.type]}`}>
                    {doc.type === 'invoice' ? 'Счет' : 'Накладная'}
                </span>
            </div>
            <p className="text-sm text-brand-text-secondary">Клиент: <strong className="text-brand-text-primary">{doc.customerName}</strong></p>
            <p className="text-sm text-brand-text-secondary">Сумма: <strong className="text-brand-text-primary">{doc.totalAmount.toLocaleString('ru-RU')} ₽</strong></p>
            <div className="mt-3 pt-2 border-t border-brand-border flex justify-end">
                <Button onClick={(e) => { e.stopPropagation(); handlePrint(); }} size="sm" leftIcon={<PrinterIcon className="h-4 w-4"/>}>Печать</Button>
            </div>
        </Card>
    );
};


const DocumentsPage: React.FC = () => {
    const { isMobileView } = useView();
    const [documents, setDocuments] = useState<DocumentWithCustomer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | DocTypeEnum>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys, direction: SortDirection }>({ key: 'date', direction: 'desc' });
    
    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiService.getDocuments({
                searchTerm,
                typeFilter: typeFilter === 'all' ? undefined : typeFilter,
            });
            setDocuments(data);
        } catch (err) {
            setError("Не удалось загрузить документы.");
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, typeFilter]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);
    
    const requestSort = (key: SortableKeys) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key: SortableKeys) => {
        if (!sortConfig || sortConfig.key !== key) {
          return <ArrowsUpDownIcon className="h-4 w-4 inline ml-1 opacity-30" />;
        }
        return sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4 inline ml-1" /> : <ChevronDownIcon className="h-4 w-4 inline ml-1" />;
    };

    const sortedDocuments = useMemo(() => {
        let sortableItems = [...documents];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [documents, sortConfig]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
                <DocumentChartBarIcon className="h-8 w-8 mr-3 text-brand-primary" />
                Документы
            </h1>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Input
                        id="docs-search-input"
                        type="text"
                        placeholder="Поиск по номеру, клиенту..."
                        value={searchTerm}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted"/>}
                    />
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2"><FunnelIcon className="h-5 w-5 text-brand-text-muted" /></span>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as any)}
                            className="w-full pl-10 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-lg focus:ring-1 focus:ring-sky-500 text-brand-text-primary"
                        >
                            <option value="all">Все типы</option>
                            <option value="invoice">Счет</option>
                            <option value="waybill">Накладная</option>
                        </select>
                    </div>
                </div>

                {isLoading ? <LoadingSpinner /> : error ? <p className="text-red-500 text-center">{error}</p> : (
                    sortedDocuments.length > 0 ? (
                        isMobileView ? (
                            <div className="space-y-3">
                                {sortedDocuments.map(doc => <MobileDocumentCard key={doc.id} doc={doc} />)}
                            </div>
                        ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-brand-text-secondary">
                                <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('number')}>Номер {getSortIcon('number')}</th>
                                        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('type')}>Тип {getSortIcon('type')}</th>
                                        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('date')}>Дата {getSortIcon('date')}</th>
                                        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('customerName')}>Клиент {getSortIcon('customerName')}</th>
                                        <th scope="col" className="px-6 py-3 text-right cursor-pointer" onClick={() => requestSort('totalAmount')}>Сумма {getSortIcon('totalAmount')}</th>
                                        <th scope="col" className="px-6 py-3 text-center">Действия</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                    {sortedDocuments.map(doc => (
                                        <tr key={doc.id} className="hover:bg-brand-secondary cursor-pointer" onClick={() => window.open(`${ROUTE_PATHS.PRINT_DOCUMENT}/${doc.id}`, '_blank')}>
                                            <td className="px-4 py-3 font-medium text-brand-text-primary">{doc.number}</td>
                                            <td className="px-6 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${DOCUMENT_TYPE_COLOR_MAP[doc.type]}`}>{doc.type === 'invoice' ? 'Счет' : 'Накладная'}</span></td>
                                            <td className="px-6 py-3">{new Date(doc.date).toLocaleDateString('ru-RU')}</td>
                                            <td className="px-6 py-3">{doc.customerName}</td>
                                            <td className="px-6 py-3 text-right">{doc.totalAmount.toLocaleString('ru-RU')} ₽</td>
                                            <td className="px-6 py-3 text-center">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => { e.stopPropagation(); window.open(`${ROUTE_PATHS.PRINT_DOCUMENT}/${doc.id}`, '_blank'); }}
                                                    leftIcon={<PrinterIcon className="h-4 w-4" />}
                                                >
                                                    Печать
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        )
                    ) : (
                        <div className="text-center p-8 text-brand-text-muted">
                            <TableCellsIcon className="h-12 w-12 mx-auto mb-2" />
                            <p>Документы не найдены.</p>
                        </div>
                    )
                )}
            </Card>
        </div>
    );
};

export default DocumentsPage;