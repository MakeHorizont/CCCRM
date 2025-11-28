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
    ArchiveBoxIcon, ArrowUturnLeftIcon, TrashIcon, PhoneIcon, EnvelopeIcon, SaveIcon
} from '../UI/Icons';
import { PRIORITY_ICON_MAP, formatPhoneNumber, ROUTE_PATHS, SOCIAL_MEDIA_PLATFORMS } from '../../constants';
import Tooltip from '../UI/Tooltip';
import { useView } from '../../hooks/useView';
import MobileContactCard from './MobileContactCard';
import ConfirmationModal from '../UI/ConfirmationModal';

const REQUISITE_FIELDS: (keyof Requisites)[] = [
    'name', 'legalAddress', 'inn', 'ogrn', 'bankAccount', 'bankName', 'bik', 'city', 'correspondentAccount', 'okpo', 'oktmo', 'phone', 'email', 'website'
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
    website: 'Сайт'
};

type ViewMode = 'active' | 'archived';
type ContactTypeFilter = 'all' | 'client' | 'supplier';


const ContactsPage: React.FC = () => {
  const { isMobileView } = useView();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [typeFilter, setTypeFilter] = useState<ContactTypeFilter>('all');
  
  const [expandedRequisites, setExpandedRequisites] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getContacts({ searchTerm, viewMode, type: typeFilter });
      setContacts(data);
    } catch (err) {
      setError(`Не удалось загрузить ${viewMode === 'active' ? 'активные' : 'архивные'} контакты.`);
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
        setContacts(prevContacts => prevContacts.map(c => c.id === contactId ? updatedContact : c));
        apiService.updateContact(updatedContact).catch(err => {
            setError("Ошибка обновления приоритета");
            fetchContacts();
        });
    }
  };


  const toggleRequisites = (contactId: string) => {
    setExpandedRequisites(prev => ({...prev, [contactId]: !prev[contactId]}));
  };

  const handleSendEmail = (email?: string) => {
    if (email) {
      navigate(`${ROUTE_PATHS.MAIL}?to=${encodeURIComponent(email)}`);
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
          aria-label={tooltipText || (priorityInfo ? priorityInfo.label : "Установить приоритет")}
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
          {viewMode === 'active' ? 'Контакты' : 'Архив контактов'}
        </h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <Button
            onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')}
            variant="secondary"
            leftIcon={<ViewArchiveIcon className="h-5 w-5"/>}
            fullWidth={isMobileView}
          >
            {viewMode === 'active' ? 'Перейти в архив' : 'Активные контакты'}
          </Button>
          {viewMode === 'active' && (
            <Button onClick={() => navigate(`${ROUTE_PATHS.CONTACTS}/new`)} variant="primary" fullWidth={isMobileView}>
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Добавить контакт
            </Button>
          )}
        </div>
      </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:max-w-md">
                 <Input
                    id="contacts-search-input"
                    type="text"
                    placeholder="Поиск по ФИО, телефону, email, юр. лицу, ИНН..."
                    value={searchTerm}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted"/>}
                 />
            </div>
            <div className="flex space-x-2 p-1 bg-brand-surface rounded-lg">
                <Button size="sm" variant={typeFilter === 'all' ? 'secondary' : 'ghost'} onClick={() => setTypeFilter('all')}>Все</Button>
                <Button size="sm" variant={typeFilter === 'client' ? 'secondary' : 'ghost'} onClick={() => setTypeFilter('client')}>Клиенты</Button>
                <Button size="sm" variant={typeFilter === 'supplier' ? 'secondary' : 'ghost'} onClick={() => setTypeFilter('supplier')}>Поставщики</Button>
            </div>
        </div>

      <Card>
        {isLoading && <div className="flex justify-center p-8"><LoadingSpinner /></div>}
        {error && <p className="text-red-500 text-center p-4">{error}</p>}

        {!isLoading && !error && (
          contacts.length > 0 ? (
            isMobileView ? (
              <div>
                {contacts.map(contact => (
                    <MobileContactCard
                        key={contact.id}
                        contact={contact}
                        onView={(c) => navigate(`${ROUTE_PATHS.CONTACTS}/${c.id}`)}
                        handlePriorityChange={handlePriorityChange}
                        handleSendEmail={handleSendEmail}
                        PriorityDisplayButton={PriorityDisplayButton}
                    />
                ))}
              </div>
            ) : (
            <div className="overflow-x-auto relative pb-2">
              <table className="min-w-full text-sm text-left text-brand-text-secondary">
                <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-2 py-3 w-12 text-center">Приор.</th>
                    <th scope="col" className="px-6 py-3 min-w-[200px] sticky left-0 bg-brand-surface z-20">Имя / Компания</th>
                    <th scope="col" className="px-6 py-3 min-w-[140px]">Тип</th>
                    <th scope="col" className="px-6 py-3 min-w-[180px]">Телефон</th>
                    <th scope="col" className="px-6 py-3 min-w-[200px]">Email</th>
                    <th scope="col" className="px-6 py-3 min-w-[150px]">Город</th>
                    <th scope="col" className="px-6 py-3 min-w-[200px]">Реквизиты</th>
                    <th scope="col" className="px-6 py-3 min-w-[150px] text-center">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {contacts.map((contact) => (
                    <React.Fragment key={contact.id}>
                    <tr className={`group hover:bg-brand-secondary transition-colors cursor-pointer ${contact.isArchived ? 'opacity-70' : ''}`} onClick={() => navigate(`${ROUTE_PATHS.CONTACTS}/${contact.id}`)}>
                      <td className="px-2 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <PriorityDisplayButton
                            priority={contact.priority}
                            onClick={() => handlePriorityChange(contact.id, contact.priority)}
                            disabled={contact.isArchived}
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-brand-text-primary whitespace-nowrap sticky left-0 bg-brand-card group-hover:bg-brand-secondary z-10 transition-colors">
                        <div>{contact.name}</div>
                        {contact.companyName && <div className="text-xs text-brand-text-muted">{contact.companyName}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1 items-start">
                          {contact.isClient && <span className="px-2 py-1 text-xs rounded-md w-fit bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">Клиент</span>}
                          {contact.isSupplier && <span className="px-2 py-1 text-xs rounded-md w-fit bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300">{contact.supplierType ? `Поставщик (${contact.supplierType})` : 'Поставщик'}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{contact.phone ? formatPhoneNumber(contact.phone) : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{contact.email || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{contact.city || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {contact.requisites?.name || contact.requisites?.inn ? (
                             <Button size="sm" variant="ghost" onClick={() => toggleRequisites(contact.id)} className="text-xs">
                                {contact.requisites.name || `ИНН: ${contact.requisites.inn}`}
                                {expandedRequisites[contact.id] ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />}
                            </Button>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          <Tooltip text="Просмотр/Редактирование">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`${ROUTE_PATHS.CONTACTS}/${contact.id}`)} aria-label="Просмотр/Редактирование">
                              <PencilSquareIcon className="h-5 w-5" />
                            </Button>
                          </Tooltip>
                          <Tooltip text="Отправить письмо">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleSendEmail(contact.email)} 
                                aria-label="Отправить письмо"
                                disabled={!contact.email || contact.isArchived}
                            >
                              <PaperAirplaneIcon className="h-5 w-5" />
                            </Button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                    {expandedRequisites[contact.id] && contact.requisites && (
                        <tr className={`bg-brand-surface ${contact.isArchived ? 'opacity-70' : ''}`}>
                            <td/> {/* Spacer for priority */}
                            <td colSpan={7} className="p-4 bg-brand-surface sticky left-0 z-10">
                                <h4 className="text-md font-semibold mb-2 text-brand-text-primary">Реквизиты: {contact.name}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                                    {REQUISITE_FIELDS.map(key => {
                                        const value = contact.requisites?.[key];
                                        if (!value) return null;
                                        const formattedValue = key === 'phone' ? formatPhoneNumber(value as string) : value;
                                        return (
                                            <div key={key} className="flex group items-center">
                                                <strong className="w-auto min-w-[120px] text-brand-text-muted shrink-0 mr-1">{REQUISITE_LABELS[key]}:</strong>
                                                <Tooltip text={String(formattedValue)} position="top">
                                                  <span className="flex-grow text-brand-text-primary truncate">{String(formattedValue)}</span>
                                                </Tooltip>
                                            </div>
                                        );
                                    })}
                                </div>
                                {contact.deliveryRequisites && <div className="mt-2 text-xs"><strong className="text-brand-text-muted">Адрес доставки:</strong> <span className="text-brand-text-primary">{contact.deliveryRequisites}</span></div>}
                                {contact.contractFileUrl && <div className="mt-2 text-xs"><strong className="text-brand-text-muted">Договор:</strong> <a href={contact.contractFileUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 flex items-center"><PaperClipIcon className="h-3 w-3 mr-1"/>Посмотреть файл</a></div>}
                                {contact.notes && <div className="mt-2 text-xs italic"><strong className="text-brand-text-muted">Заметки:</strong> <span className="text-brand-text-primary">{contact.notes}</span></div>}
                            </td>
                        </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            )
          ) : (
            <div className="text-center p-8 text-brand-text-muted">
              <IdentificationIcon className="h-12 w-12 mx-auto mb-2" />
              <p>{viewMode === 'active' ? 'Активные контакты не найдены.' : 'Архивные контакты не найдены.'}</p>
              {contacts.length === 0 && searchTerm && <p className="text-sm">Попробуйте изменить условия поиска.</p>}
            </div>
          )
        )}
      </Card>
    </div>
  );
};

export default ContactsPage;


// --- Contact Editor Page Component ---
type EditorMode = 'view' | 'edit';

export const ContactEditorPage: React.FC = () => {
    const { contactId } = useParams<{ contactId: string }>();
    const navigate = useNavigate();
    const isNew = !contactId;

    const [editingContact, setEditingContact] = useState<Partial<Contact> | null>(null);
    const [mode, setMode] = useState<EditorMode>(isNew ? 'edit' : 'view');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchContact = async () => {
            if (!isNew) {
                setIsLoading(true);
                try {
                    const allContacts = await apiService.getContacts({ viewMode: 'all' });
                    const contact = allContacts.find(c => c.id === contactId);
                    if (contact) {
                        setEditingContact(contact);
                    } else {
                        setError("Контакт не найден.");
                    }
                } catch (err) {
                    setError("Не удалось загрузить данные контакта.");
                } finally {
                    setIsLoading(false);
                }
            } else {
                setEditingContact({ priority: null, socialMedia: {}, requisites: {}, isArchived: false, isClient: true, isSupplier: false });
                setIsLoading(false);
            }
        };
        fetchContact();
    }, [contactId, isNew]);

    const handleConfirmSave = async () => {
        setIsSaveConfirmOpen(false);
        if (!editingContact) return;
        setIsSaving(true);
        setError(null);
        try {
            const contactData = { ...editingContact };

            if (editingContact.id) {
                await apiService.updateContact(contactData as Contact);
            } else {
                await apiService.addContact(contactData as Omit<Contact, 'id' | 'isArchived' | 'archivedAt'>);
            }
            navigate(ROUTE_PATHS.CONTACTS);
        } catch (err) {
            setError((err as Error).message || 'Не удалось сохранить контакт.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSaveInitiate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingContact || !editingContact.name) {
            setError("Имя контакта обязательно для заполнения.");
            return;
        }
        if (!editingContact.isClient && !editingContact.isSupplier) {
            setError("Контакт должен быть либо клиентом, либо поставщиком (или и тем, и другим).");
            return;
        }
        setIsSaveConfirmOpen(true);
    };
    
    const handleArchiveToggle = async () => {
        if(!editingContact || !editingContact.id) return;
        setIsSaving(true);
        try {
          await apiService.archiveContact(editingContact.id, !editingContact.isArchived);
          navigate(ROUTE_PATHS.CONTACTS);
        } catch (err) {
          setError('Ошибка архивации/восстановления контакта.');
        } finally {
          setIsSaving(false);
          setIsArchiveConfirmOpen(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!editingContact || !editingContact.id) return;
        setIsSaving(true);
        try {
          await apiService.deleteContact(editingContact.id);
          navigate(ROUTE_PATHS.CONTACTS);
        } catch (err) {
          setError((err as Error).message || 'Ошибка удаления контакта.');
        } finally {
          setIsSaving(false);
          setIsDeleteConfirmOpen(false);
        }
    };
    
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!editingContact) return;
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setEditingContact(prev => ({...prev, [name]: checked}));
        } else {
            setEditingContact(prev => ({ ...prev, [name]: value }));
        }
    };
    
    if (isLoading) return <LoadingSpinner />;
    if (error && !editingContact) return <p className="text-red-500">{error}</p>;
    if (!editingContact) return null;
    
    const pageTitle = isNew ? 'Новый контакт' : mode === 'edit' ? `Редактирование: ${editingContact.name}` : `Контакт: ${editingContact.name}`;
    const isFormDisabled = mode === 'view' || isSaving;

    return (
        <div className="space-y-4">
            <Button onClick={() => navigate(ROUTE_PATHS.CONTACTS)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                К списку контактов
            </Button>
            
            <form onSubmit={handleSaveInitiate} className="space-y-4">
               <div className="flex justify-between items-center">
                 <h1 className="text-2xl font-semibold">{pageTitle}</h1>
                 <div className="flex space-x-2">
                    {mode === 'view' && !editingContact.isArchived && (
                        <Button onClick={() => setMode('edit')} type="button" variant="primary" leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>Редактировать</Button>
                    )}
                     {mode !== 'view' && (
                        <Button type="submit" isLoading={isSaving} variant="primary" leftIcon={<SaveIcon className="h-4 w-4"/>}>Сохранить</Button>
                     )}
                </div>
               </div>
            
               <Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <Input id="name" name="name" label="ФИО / Название *" value={editingContact.name || ''} onChange={handleInputChange} required autoFocus disabled={isFormDisabled}/>
                       <Input id="companyName" name="companyName" label="Компания" value={editingContact.companyName || ''} onChange={handleInputChange} disabled={isFormDisabled}/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <Input id="phone" name="phone" label="Телефон" value={editingContact.phone || ''} onChange={handleInputChange} icon={<PhoneIcon className="h-5 w-5 text-brand-text-muted"/>} disabled={isFormDisabled}/>
                        <Input id="email" name="email" label="Email" type="email" value={editingContact.email || ''} onChange={handleInputChange} icon={<EnvelopeIcon className="h-5 w-5 text-brand-text-muted"/>} disabled={isFormDisabled}/>
                    </div>
                     <div className="flex space-x-6 items-center mt-4">
                        <label className="flex items-center space-x-2"><input type="checkbox" name="isClient" checked={editingContact.isClient || false} onChange={handleInputChange} disabled={isFormDisabled}/><span>Клиент</span></label>
                        <label className="flex items-center space-x-2"><input type="checkbox" name="isSupplier" checked={editingContact.isSupplier || false} onChange={handleInputChange} disabled={isFormDisabled}/><span>Поставщик</span></label>
                        {editingContact.isSupplier && <Input id="supplierType" name="supplierType" label="Тип поставщика" value={editingContact.supplierType || ''} onChange={handleInputChange} disabled={isFormDisabled}/>}
                        <label className="flex items-center space-x-2"><input type="checkbox" name="isMoscowDelivery" checked={editingContact.isMoscowDelivery || false} onChange={handleInputChange} disabled={isFormDisabled}/><span>Доставка по Москве</span></label>
                     </div>
                </Card>

                 <div className="flex space-x-2">
                    {editingContact.id && mode === 'view' && !editingContact.isArchived && (
                        <Button type="button" variant="secondary" onClick={() => setIsArchiveConfirmOpen(true)} isLoading={isSaving} leftIcon={<ArchiveBoxIcon className="h-5 w-5"/>}>Архивировать</Button>
                    )}
                    {editingContact.id && editingContact.isArchived && (
                        <>
                           <Button type="button" variant="secondary" onClick={() => handleArchiveToggle()} isLoading={isSaving} leftIcon={<ArrowUturnLeftIcon className="h-5 w-5"/>}>Восстановить</Button>
                           <Button type="button" variant="danger" onClick={() => setIsDeleteConfirmOpen(true)} isLoading={isSaving} leftIcon={<TrashIcon className="h-5 w-5"/>}>Удалить</Button>
                        </>
                    )}
                 </div>

            </form>
            {isSaveConfirmOpen && <ConfirmationModal isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} onConfirm={handleConfirmSave} title="Подтвердить сохранение?" message="Вы уверены, что хотите сохранить внесенные изменения?" confirmText="Сохранить" isLoading={isSaving} />}
            {isArchiveConfirmOpen && editingContact && <ConfirmationModal isOpen={isArchiveConfirmOpen} onClose={() => setIsArchiveConfirmOpen(false)} onConfirm={handleArchiveToggle} title="Архивировать контакт?" message={<p>Вы уверены, что хотите архивировать контакт <strong className="text-brand-text-primary">{editingContact.name}</strong>?</p>} confirmText="Да, архивировать" confirmButtonVariant="danger" isLoading={isSaving} />}
            {isDeleteConfirmOpen && editingContact && <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDeleteConfirm} title="Подтверждение удаления" message={<p>Вы уверены, что хотите окончательно удалить контакт <strong className="text-brand-text-primary">{editingContact.name}</strong>? Это действие необратимо.</p>} confirmText="Удалить" isLoading={isSaving} />}
        </div>
    );
};