
import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Contact, ContactPriority, Requisites, SocialMediaLinks } from '../../types';
import { apiService } from '../../services/apiService';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import {
    PlusCircleIcon, MagnifyingGlassIcon, PencilSquareIcon, IdentificationIcon,
    ChevronDownIcon, ChevronUpIcon, HashtagIcon, FireIcon, StarIcon, SparklesIcon,
    PaperClipIcon, ArchiveBoxIcon as ViewArchiveIcon, PaperAirplaneIcon, ArrowLeftIcon,
    ArchiveBoxIcon, ArrowUturnLeftIcon, TrashIcon, PhoneIcon, EnvelopeIcon, SaveIcon,
    FunnelIcon
} from '../UI/Icons';
import { PRIORITY_ICON_MAP, formatPhoneNumber, ROUTE_PATHS, SOCIAL_MEDIA_PLATFORMS } from '../../constants';
import Tooltip from '../UI/Tooltip';
import { useView } from '../../hooks/useView';
import MobileContactCard from './MobileContactCard';
import ConfirmationModal from '../UI/ConfirmationModal';

type ViewMode = 'active' | 'archived';
type ContactTypeFilter = 'all' | 'client' | 'supplier' | 'tech' | 'landlord';

// Added EditorMode type for the editor component
type EditorMode = 'view' | 'edit';

// Constants for requisition forms
const REQUISITE_FIELDS: (keyof Requisites)[] = [
    'name', 'legalAddress', 'inn', 'ogrn', 'bankAccount', 'bankName', 'bik', 'city', 'correspondentAccount', 'okpo', 'oktmo', 'phone', 'email', 'website', 'kpp'
];

const REQUISITE_LABELS: Record<keyof Requisites, string> = {
    name: 'Наименование юр. лица',
    legalAddress: 'Юр. адрес',
    inn: 'ИНН',
    ogrn: 'ОГРН',
    bankAccount: 'Расчетный счет',
    bankName: 'Название банка',
    bik: 'БИК',
    city: 'Город банка',
    correspondentAccount: 'Корр. счет',
    okpo: 'ОКПО',
    oktmo: 'ОКТМО',
    phone: 'Телефон (юр. лица)',
    email: 'E-mail (юр. лица)',
    website: 'Сайт',
    // FIX: Add missing 'kpp' key to satisfy type requirement
    kpp: 'КПП'
};

const ContactsPage: React.FC = () => {
  const { isMobileView } = useView();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [typeFilter, setTypeFilter] = useState<ContactTypeFilter>('all');
  
  const navigate = useNavigate();

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Map extended filters to basic API types
      let apiType: 'all' | 'client' | 'supplier' = 'all';
      if (typeFilter === 'client') apiType = 'client';
      if (typeFilter === 'supplier' || typeFilter === 'tech' || typeFilter === 'landlord') apiType = 'supplier';

      let data = await apiService.getContacts({ searchTerm, viewMode, type: apiType });
      
      // Perform local filtering for specific subtypes
      if (typeFilter === 'tech') {
          data = data.filter(c => c.supplierType === 'Технический специалист');
      } else if (typeFilter === 'landlord') {
          data = data.filter(c => c.supplierType === 'Арендатор');
      }

      setContacts(data);
    } catch (err) {
      setError(`Не удалось загрузить контакты.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, viewMode, typeFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handlePriorityChange = (contactId: string, currentPriority: ContactPriority | null) => {
    const priorities: (ContactPriority | null)[] = ['1', '2', '3', null];
    const currentIndex = priorities.indexOf(currentPriority);
    const nextPriority = priorities[(currentIndex + 1) % priorities.length];
    const contactToUpdate = contacts.find(c => c.id === contactId);
    if (contactToUpdate) {
        const updatedContact = { ...contactToUpdate, priority: nextPriority };
        apiService.updateContact(updatedContact).then(() => fetchContacts());
    }
  };

  const PriorityDisplayButton: React.FC<{priority: ContactPriority | null, onClick?: () => void, disabled?: boolean, tooltipText?: string}> = React.memo(({ priority, onClick, disabled, tooltipText }) => {
    const priorityInfo = priority ? PRIORITY_ICON_MAP[priority] : null;
    const IconComponent = priorityInfo ? priorityInfo.icon : HashtagIcon;
    return (
      <Tooltip text={tooltipText || (priorityInfo ? priorityInfo.label : "Нет приоритета")} position="right">
        <button
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          disabled={disabled}
          className={`p-1 rounded-full text-lg ${priorityInfo ? priorityInfo.color : 'text-brand-text-muted'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-75'}`}
        >
          <IconComponent className={`h-5 w-5 ${!priority ? 'opacity-50' : ''}`} />
        </button>
      </Tooltip>
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-semibold text-brand-text-primary mb-4 sm:mb-0 flex items-center">
          <IdentificationIcon className="h-8 w-8 mr-3 text-brand-primary" />
          {viewMode === 'active' ? 'База Контактов' : 'Архив контактов'}
        </h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <Button onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')} variant="secondary" leftIcon={<ViewArchiveIcon className="h-5 w-5"/>}>
            {viewMode === 'active' ? 'Архив' : 'Активные'}
          </Button>
          <Button onClick={() => navigate(`${ROUTE_PATHS.CONTACTS}/new`)} variant="primary">
            <PlusCircleIcon className="h-5 w-5 mr-2" /> Добавить
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:max-w-md">
             <Input id="search" type="text" placeholder="Поиск по ФИО, ИНН..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted"/>} />
        </div>
        <div className="flex items-center gap-2 bg-brand-surface p-1 rounded-lg border border-brand-border">
            <FunnelIcon className="h-5 w-5 ml-2 text-brand-text-muted"/>
            <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value as ContactTypeFilter)}
                className="bg-transparent border-none text-sm focus:ring-0 text-brand-text-primary"
            >
                <option value="all">Все группы</option>
                <option value="client">Клиенты</option>
                <option value="supplier">Поставщики (Общее)</option>
                <option value="tech">Технические специалисты</option>
                <option value="landlord">Арендаторы</option>
            </select>
        </div>
      </div>

      <Card>
        {isLoading ? <div className="flex justify-center p-8"><LoadingSpinner /></div> : (
          contacts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                  <tr>
                    <th className="px-2 py-3 text-center"></th>
                    <th className="px-6 py-3">Имя / Компания</th>
                    <th className="px-6 py-3">Категория</th>
                    <th className="px-6 py-3">Телефон</th>
                    <th className="px-6 py-3">Город</th>
                    <th className="px-6 py-3 text-center">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-brand-secondary cursor-pointer" onClick={() => navigate(`${ROUTE_PATHS.CONTACTS}/${contact.id}`)}>
                      <td className="px-2 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <PriorityDisplayButton priority={contact.priority} onClick={() => handlePriorityChange(contact.id, contact.priority)} />
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {contact.name}
                        {contact.companyName && <div className="text-xs text-brand-text-muted">{contact.companyName}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${contact.isClient ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                            {contact.isClient ? 'Клиент' : contact.supplierType || 'Поставщик'}
                        </span>
                      </td>
                      <td className="px-6 py-4">{formatPhoneNumber(contact.phone)}</td>
                      <td className="px-6 py-4">{contact.city || '-'}</td>
                      <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                         <Button variant="ghost" size="sm" onClick={() => navigate(`${ROUTE_PATHS.CONTACTS}/${contact.id}`)}><PencilSquareIcon className="h-5 w-5"/></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-center p-8 text-brand-text-muted">Ничего не найдено.</p>
        )}
      </Card>
    </div>
  );
};

// Fixed error in App.tsx on line 8 by exporting ContactEditorPage
/**
 * ContactEditorPage Component
 * Full-page editor for creating and updating contacts.
 */
export const ContactEditorPage: React.FC = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const isNew = contactId === 'new';
  
  const [mode, setMode] = useState<EditorMode>(isNew ? 'edit' : 'view');
  const [contact, setContact] = useState<Partial<Contact>>({});
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchContact = async () => {
      if (isNew) {
        setContact({
          name: '',
          priority: null,
          isClient: true,
          isSupplier: false,
          socialMedia: {},
          requisites: {},
          isArchived: false,
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await apiService.getContacts({ viewMode: 'all' });
        const found = data.find(c => c.id === contactId);
        if (found) {
          setContact(found);
        } else {
          setError("Контакт не найден.");
        }
      } catch (err) {
        setError("Ошибка загрузки данных.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchContact();
  }, [contactId, isNew]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setContact(prev => ({ ...prev, [name]: checked }));
    } else {
        setContact(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSocialChange = (platform: keyof SocialMediaLinks, value: string) => {
    setContact(prev => ({
        ...prev,
        socialMedia: { ...(prev.socialMedia || {}), [platform]: value }
    }));
  };

  const handleRequisiteChange = (field: keyof Requisites, value: string) => {
    setContact(prev => ({
        ...prev,
        requisites: { ...(prev.requisites || {}), [field]: value }
    }));
  };

  const handleConfirmSave = async () => {
    if (!contact.name?.trim()) {
      setError("Имя или название компании обязательно.");
      setIsSaveConfirmOpen(false);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (isNew) {
        await apiService.addContact(contact as any);
      } else {
        await apiService.updateContact(contact as Contact);
      }
      navigate(ROUTE_PATHS.CONTACTS);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
      setIsSaveConfirmOpen(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!contact.id) return;
    setIsSaving(true);
    try {
      await apiService.archiveContact(contact.id, !contact.isArchived);
      navigate(ROUTE_PATHS.CONTACTS);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
      setIsArchiveConfirmOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!contact.id) return;
    setIsSaving(true);
    try {
      await apiService.deleteContact(contact.id);
      navigate(ROUTE_PATHS.CONTACTS);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;
  if (error && !contact.id) return <p className="text-red-500 text-center p-8">{error}</p>;
  if (!contact) return null;

  const pageTitle = isNew ? 'Новый контакт' : (mode === 'edit' ? `Редактирование: ${contact.name}` : `Контакт: ${contact.name}`);
  const isFormDisabled = mode === 'view' || isSaving;

  return (
    <div className="space-y-4">
        <Button onClick={() => navigate(ROUTE_PATHS.CONTACTS)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
            К списку контактов
        </Button>
        
        <form onSubmit={(e) => { e.preventDefault(); setIsSaveConfirmOpen(true); }}>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">{pageTitle}</h1>
                <div className="flex space-x-2">
                    {mode === 'view' && !contact.isArchived && (
                        <Button type="button" onClick={() => setMode('edit')} variant="primary" leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>Редактировать</Button>
                    )}
                    {mode === 'edit' && !contact.isArchived && (
                         <Button type="submit" isLoading={isSaving} variant="primary" leftIcon={<SaveIcon className="h-4 w-4"/>}>Сохранить</Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <h3 className="text-lg font-semibold mb-4 border-b border-brand-border pb-2">Основная информация</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input id="name" name="name" label="ФИО / Название *" value={contact.name || ''} onChange={handleInputChange} required disabled={isFormDisabled} />
                            <Input id="companyName" name="companyName" label="Компания" value={contact.companyName || ''} onChange={handleInputChange} disabled={isFormDisabled} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <Input id="email" name="email" label="E-mail" type="email" value={contact.email || ''} onChange={handleInputChange} disabled={isFormDisabled} icon={<EnvelopeIcon className="h-4 w-4 text-brand-text-muted"/>} />
                            <Input id="phone" name="phone" label="Телефон" value={contact.phone || ''} onChange={handleInputChange} disabled={isFormDisabled} icon={<PhoneIcon className="h-4 w-4 text-brand-text-muted"/>} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                             <Input id="city" name="city" label="Город" value={contact.city || ''} onChange={handleInputChange} disabled={isFormDisabled} />
                             <Input id="address" name="address" label="Адрес доставки" value={contact.address || ''} onChange={handleInputChange} disabled={isFormDisabled} />
                        </div>
                        <div className="mt-4 flex items-center space-x-6">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" name="isClient" checked={contact.isClient || false} onChange={handleInputChange} disabled={isFormDisabled} className="h-4 w-4 text-sky-600 border-brand-border rounded focus:ring-sky-500" />
                                <span className="text-sm">Клиент</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" name="isSupplier" checked={contact.isSupplier || false} onChange={handleInputChange} disabled={isFormDisabled} className="h-4 w-4 text-sky-600 border-brand-border rounded focus:ring-sky-500" />
                                <span className="text-sm">Поставщик</span>
                            </label>
                             {contact.isSupplier && (
                                <div className="flex-grow">
                                    <select name="supplierType" value={contact.supplierType || ''} onChange={handleInputChange} disabled={isFormDisabled} className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-sm text-brand-text-primary focus:ring-sky-500">
                                        <option value="">Выберите тип поставщика...</option>
                                        <option value="Сырьё">Сырьё</option>
                                        <option value="Упаковка">Упаковка</option>
                                        <option value="Оборудование">Оборудование</option>
                                        <option value="Технический специалист">Технический специалист</option>
                                        <option value="Арендатор">Арендатор</option>
                                        <option value="Логистика">Логистика</option>
                                        <option value="Прочее">Прочее</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-lg font-semibold mb-4 border-b border-brand-border pb-2">Социальные сети и мессенджеры</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(SOCIAL_MEDIA_PLATFORMS).map(([platform, info]) => (
                                <Input
                                    key={platform}
                                    id={`social-${platform}`}
                                    label={info.label}
                                    placeholder={info.placeholder}
                                    value={contact.socialMedia?.[platform as keyof SocialMediaLinks] || ''}
                                    onChange={(e) => handleSocialChange(platform as keyof SocialMediaLinks, e.target.value)}
                                    disabled={isFormDisabled}
                                    icon={<info.icon className="h-4 w-4 text-brand-text-muted"/>}
                                />
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-4">
                    <Card>
                        <h3 className="text-lg font-semibold mb-4 border-b border-brand-border pb-2">Реквизиты</h3>
                        <div className="space-y-3">
                            {REQUISITE_FIELDS.map(field => (
                                <Input
                                    key={field}
                                    id={`req-${field}`}
                                    label={REQUISITE_LABELS[field]}
                                    value={contact.requisites?.[field] || ''}
                                    onChange={(e) => handleRequisiteChange(field, e.target.value)}
                                    disabled={isFormDisabled}
                                    className="!py-1 text-xs"
                                    smallLabel
                                />
                            ))}
                        </div>
                    </Card>
                    
                    <Card>
                        <h3 className="text-lg font-semibold mb-2">Заметки</h3>
                        <textarea
                            name="notes"
                            value={contact.notes || ''}
                            onChange={handleInputChange}
                            disabled={isFormDisabled}
                            rows={4}
                            placeholder="Дополнительная информация о контакте..."
                            className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-sm text-brand-text-primary focus:ring-sky-500"
                        />
                    </Card>
                </div>
            </div>

            <div className="flex space-x-2 mt-4">
                {contact.id && mode === 'view' && !contact.isArchived && (
                    <Button type="button" variant="secondary" onClick={() => setIsArchiveConfirmOpen(true)} leftIcon={<ArchiveBoxIcon className="h-5 w-5"/>}>Архивировать</Button>
                )}
                {contact.id && contact.isArchived && (
                    <>
                        <Button type="button" variant="secondary" onClick={handleArchiveToggle} isLoading={isSaving} leftIcon={<ArrowUturnLeftIcon className="h-5 w-5"/>}>Восстановить</Button>
                        <Button type="button" variant="danger" onClick={() => setIsDeleteConfirmOpen(true)} isLoading={isSaving} leftIcon={<TrashIcon className="h-5 w-5"/>}>Удалить</Button>
                    </>
                )}
            </div>
        </form>

        {isSaveConfirmOpen && <ConfirmationModal isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} onConfirm={handleConfirmSave} title="Подтвердить сохранение" message="Сохранить изменения в карточке контакта?" confirmText="Сохранить" isLoading={isSaving} />}
        {isArchiveConfirmOpen && <ConfirmationModal isOpen={isArchiveConfirmOpen} onClose={() => setIsArchiveConfirmOpen(false)} onConfirm={handleArchiveToggle} title="Архивировать?" message="Контакт будет перемещен в архив." confirmText="Да, архивировать" confirmButtonVariant="danger" isLoading={isSaving} />}
        {isDeleteConfirmOpen && <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title="Удалить?" message="Это действие необратимо. Карточка контакта будет удалена навсегда." confirmText="Удалить" confirmButtonVariant="danger" isLoading={isSaving} />}
    </div>
  );
};

export default ContactsPage;
