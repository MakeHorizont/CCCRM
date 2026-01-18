
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import { Document as DocumentType, DocumentType as DocTypeEnum } from '../../types';
import { apiService } from '../../services/apiService';
import {
    DocumentChartBarIcon, MagnifyingGlassIcon, FunnelIcon, PrinterIcon, ChevronUpIcon, ChevronDownIcon, ArrowsUpDownIcon,
    DocumentArrowUpIcon, TrashIcon, LinkIcon
} from '../UI/Icons';
import { ROUTE_PATHS, DOCUMENT_TYPE_COLOR_MAP } from '../../constants';
import Modal from '../UI/Modal';
import Tooltip from '../UI/Tooltip';

type SortableKeys = 'number' | 'date' | 'totalAmount' | 'customerName' | 'type';
type SortDirection = 'asc' | 'desc';
type DocumentWithCustomer = DocumentType & { customerName: string };

const DOC_TYPE_LABELS: Record<DocTypeEnum, string> = {
    invoice: 'Счёт',
    waybill: 'Накладная',
    contract: 'Договор',
    act: 'Акт',
    manual: 'Регламент',
    other: 'Прочее'
};

const DocumentsPage: React.FC = () => {
    const [documents, setDocuments] = useState<DocumentWithCustomer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | DocTypeEnum>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys, direction: SortDirection }>({ key: 'date', direction: 'desc' });
    
    // Upload Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadType, setUploadType] = useState<DocTypeEnum>('contract');
    const [uploadNumber, setUploadNumber] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) return;
        setIsLoading(true);
        try {
            // Mock upload simulation
            await new Promise(r => setTimeout(r, 1000));
            await fetchDocuments();
            setIsUploadModalOpen(false);
            setUploadFile(null);
        } catch(e) { alert("Ошибка загрузки"); }
        finally { setIsLoading(false); }
    };

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
                const valA = (a as any)[sortConfig.key];
                const valB = (b as any)[sortConfig.key];
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [documents, sortConfig]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
                    <DocumentChartBarIcon className="h-8 w-8 mr-3 text-brand-primary" />
                    Реестр Документов
                </h1>
                <Button onClick={() => setIsUploadModalOpen(true)} variant="primary" leftIcon={<DocumentArrowUpIcon className="h-5 w-5"/>}>
                    Загрузить документ
                </Button>
            </div>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Input id="docs-search" type="text" placeholder="Поиск по номеру, названию..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted"/>} />
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2"><FunnelIcon className="h-5 w-5 text-brand-text-muted" /></span>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="w-full pl-10 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-lg focus:ring-1 focus:ring-sky-500 text-brand-text-primary">
                            <option value="all">Все типы</option>
                            {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                    </div>
                </div>

                {isLoading ? <LoadingSpinner /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-brand-text-secondary">
                            <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                                <tr>
                                    <th className="px-4 py-3 cursor-pointer" onClick={() => requestSort('number')}>№ {getSortIcon('number')}</th>
                                    <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('type')}>Тип {getSortIcon('type')}</th>
                                    <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('date')}>Дата {getSortIcon('date')}</th>
                                    <th className="px-6 py-3">Контрагент</th>
                                    <th className="px-6 py-3 text-right">Сумма</th>
                                    <th className="px-6 py-3 text-center">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {sortedDocuments.map(doc => (
                                    <tr key={doc.id} className="hover:bg-brand-secondary">
                                        <td className="px-4 py-3 font-medium text-brand-text-primary">{doc.number}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${DOCUMENT_TYPE_COLOR_MAP[doc.type] || 'bg-zinc-100 text-zinc-800'}`}>
                                                {DOC_TYPE_LABELS[doc.type]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">{new Date(doc.date).toLocaleDateString('ru-RU')}</td>
                                        <td className="px-6 py-3 truncate max-w-[200px]">{doc.customerName}</td>
                                        <td className="px-6 py-3 text-right font-mono">{doc.totalAmount ? `${doc.totalAmount.toLocaleString()} ₽` : '-'}</td>
                                        <td className="px-6 py-3 text-center">
                                            <div className="flex justify-center space-x-1">
                                                {doc.fileUrl ? (
                                                     <Tooltip text="Открыть файл"><a href={doc.fileUrl} target="_blank" rel="noreferrer" className="p-1 hover:bg-brand-primary/10 rounded text-sky-500"><LinkIcon className="h-5 w-5"/></a></Tooltip>
                                                ) : (
                                                     <Tooltip text="Печать"><Button variant="ghost" size="sm" onClick={() => window.open(`${ROUTE_PATHS.PRINT_DOCUMENT}/${doc.id}`, '_blank')}><PrinterIcon className="h-5 w-5"/></Button></Tooltip>
                                                )}
                                                <Tooltip text="Удалить"><Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400"><TrashIcon className="h-5 w-5"/></Button></Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            
            <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Загрузка нового документа">
                <form onSubmit={handleUpload} className="space-y-4">
                    <Input id="doc-num" label="Номер документа" value={uploadNumber} onChange={e => setUploadNumber(e.target.value)} required />
                    <div>
                        <label className="block text-sm font-medium mb-1">Тип документа</label>
                        <select value={uploadType} onChange={e => setUploadType(e.target.value as any)} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-sm">
                            {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                    </div>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-brand-border border-dashed rounded-md bg-brand-surface cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="space-y-1 text-center">
                            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-brand-text-muted" />
                            <div className="text-sm text-brand-text-secondary">
                                <span className="text-sky-400 font-bold">{uploadFile ? uploadFile.name : 'Выберите файл'}</span>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setIsUploadModalOpen(false)}>Отмена</Button>
                        <Button type="submit" isLoading={isLoading} disabled={!uploadFile}>Загрузить в реестр</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default DocumentsPage;
