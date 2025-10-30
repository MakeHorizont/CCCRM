import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Input from '../UI/Input';
import Button from '../UI/Button';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import ConfirmationModal from '../UI/ConfirmationModal';
import { PurchaseRequest, PurchaseRequestStatus, User, Contact, HouseholdItem, PurchaseRequestItem, ProductionOrder } from '../../types';
import { TrashIcon, PlusCircleIcon, ArrowLeftIcon, PencilSquareIcon, SaveIcon } from '../UI/Icons';
import { generateId } from '../../utils/idGenerators';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { ROUTE_PATHS } from '../../constants';

type EditorMode = 'view' | 'edit';

const ALL_PURCHASE_STATUSES: PurchaseRequestStatus[] = [
    'Черновик', 'Требует утверждения', 'Утверждено', 'Заказано', 'Частично получено', 'Получено', 'Отклонено'
];

const PurchaseRequestEditorPage: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isNew = !requestId;

    const [mode, setMode] = useState<EditorMode>(isNew ? 'edit' : 'view');
    const [requestData, setRequestData] = useState<Partial<PurchaseRequest>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [availableHouseholdItems, setAvailableHouseholdItems] = useState<HouseholdItem[]>([]);
    const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
    
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const [hhItems, contacts] = await Promise.all([
                    apiService.getHouseholdItems({ viewMode: 'active' }),
                    apiService.getContacts({ viewMode: 'active', type: 'supplier' }),
                ]);
                setAvailableHouseholdItems(hhItems);
                setAvailableContacts(contacts);

                if (isNew) {
                    setRequestData({ name: '', status: 'Черновик', items: [], createdBy: { userId: user.id, userName: user.name } });
                    setMode('edit');
                } else {
                    const req = (await apiService.getPurchaseRequests({ viewMode: 'all' })).find(r => r.id === requestId);
                    if (req) {
                        setRequestData(req);
                    } else {
                        setError("Заявка не найдена.");
                    }
                    setMode('view');
                }
            } catch (e) {
                setError("Ошибка загрузки данных.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [requestId, isNew, user]);

    const handleSave = async () => {
        setIsSaveConfirmOpen(false);
        if(!user) return;
        setIsSaving(true);
        setError(null);
        try {
            const payload = { ...requestData };
            if (isNew) {
                payload.createdBy = { userId: user.id, userName: user.name };
                await apiService.addPurchaseRequest(payload as any);
            } else {
                await apiService.updatePurchaseRequest(payload as PurchaseRequest);
            }
            navigate(ROUTE_PATHS.PURCHASING);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setRequestData(prev => ({ ...prev, [name]: value }));
    };

    if (isLoading) return <LoadingSpinner />;
    if (error && !requestData.id) return <p className="text-red-500">{error}</p>;
    if (!requestData) return null;

    const pageTitle = isNew ? 'Новая заявка на закупку' : (mode === 'edit' ? `Редактирование заявки #${requestData.id}` : `Заявка #${requestData.id}`);
    const isFormDisabled = mode === 'view' || isSaving;

    return (
        <div className="space-y-4">
            <Button onClick={() => navigate(ROUTE_PATHS.PURCHASING)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                К списку заявок
            </Button>
            
            <form onSubmit={(e) => { e.preventDefault(); setIsSaveConfirmOpen(true); }}>
                 <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-semibold">{pageTitle}</h1>
                    <div className="flex space-x-2">
                        {mode === 'view' && !requestData.isArchived && (
                            <Button type="button" onClick={() => setMode('edit')} variant="primary" leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>Редактировать</Button>
                        )}
                        {mode === 'edit' && !requestData.isArchived && (
                             <Button type="submit" isLoading={isSaving} variant="primary" leftIcon={<SaveIcon className="h-4 w-4"/>}>Сохранить</Button>
                        )}
                    </div>
                </div>
                
                <Card>
                    <div className="space-y-4">
                        <Input id="pr-name" name="name" label="Название/Цель закупки *" value={requestData.name || ''} onChange={handleInputChange} required disabled={isFormDisabled}/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Статус</label>
                                <select name="status" value={requestData.status || ''} onChange={handleInputChange} disabled={isFormDisabled} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5">
                                    {ALL_PURCHASE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Поставщик</label>
                                <select name="supplierContactId" value={requestData.supplierContactId || ''} onChange={handleInputChange} disabled={isFormDisabled} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5">
                                    <option value="">Не выбран</option>
                                    {availableContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        {/* Items list and add form */}
                    </div>
                </Card>
            </form>
             {isSaveConfirmOpen && <ConfirmationModal isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} onConfirm={handleSave} title="Подтвердить сохранение" message="Сохранить изменения в заявке?" confirmText="Сохранить" isLoading={isSaving} />}
        </div>
    );
};

export default PurchaseRequestEditorPage;
