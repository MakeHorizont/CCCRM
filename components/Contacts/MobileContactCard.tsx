
import React, { useState } from 'react';
import { Contact, ContactPriority, SocialMediaLinks } from '../../types';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Tooltip from '../UI/Tooltip';
import {
    PhoneIcon, EnvelopeIcon, PencilSquareIcon, ChevronDownIcon, ChevronUpIcon, PaperClipIcon
} from '../UI/Icons';
import { formatPhoneNumber, SOCIAL_MEDIA_PLATFORMS } from '../../constants';

const REQUISITE_FIELDS: (keyof Contact['requisites'])[] = [
    'name', 'legalAddress', 'inn', 'ogrn', 'bankAccount', 'bankName', 'bik', 'city', 'correspondentAccount', 'okpo', 'oktmo', 'phone', 'email', 'website', 'kpp'
];

const REQUISITE_LABELS: Record<keyof Contact['requisites'], string> = {
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

interface MobileContactCardProps {
  contact: Contact;
  onView: (contact: Contact) => void;
  handlePriorityChange: (contactId: string, currentPriority: ContactPriority | null) => void;
  handleSendEmail: (email?: string) => void;
  PriorityDisplayButton: React.FC<{
    priority: ContactPriority | null;
    onClick?: () => void;
    disabled?: boolean;
    tooltipText?: string;
  }>;
}

const MobileContactCard: React.FC<MobileContactCardProps> = ({ contact, onView, handlePriorityChange, handleSendEmail, PriorityDisplayButton }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={`mb-3 ${contact.isArchived ? 'opacity-70 bg-brand-surface' : ''}`} onClick={() => onView(contact)}>
      <div className="flex justify-between items-start">
        <div className="flex-grow min-w-0">
          <h3 className="font-semibold text-brand-text-primary truncate" title={contact.name}>{contact.name}</h3>
          {contact.companyName && <p className="text-xs text-brand-text-muted">{contact.companyName}</p>}
           <div className="flex items-center space-x-2 mt-1">
              {contact.isClient && <span className="px-2 py-1 text-xs rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">Клиент</span>}
              {contact.isSupplier && <span className="px-2 py-1 text-xs rounded-md bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300">Поставщик</span>}
            </div>
        </div>
        <div className="flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          <PriorityDisplayButton priority={contact.priority} onClick={() => handlePriorityChange(contact.id, contact.priority)} disabled={contact.isArchived} />
        </div>
      </div>

      <div className="mt-3 flex items-center space-x-4 text-brand-text-secondary" onClick={(e) => e.stopPropagation()}>
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center space-x-1 hover:text-brand-primary">
            <PhoneIcon className="h-4 w-4" />
            <span className="text-sm">{formatPhoneNumber(contact.phone)}</span>
          </a>
        )}
        {contact.email && (
          <button onClick={() => handleSendEmail(contact.email)} className="flex items-center space-x-1 hover:text-brand-primary truncate">
            <EnvelopeIcon className="h-4 w-4" />
            <span className="text-sm truncate">{contact.email}</span>
          </button>
        )}
      </div>

      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="ghost" className="w-full text-xs justify-start p-1" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronUpIcon className="h-4 w-4 mr-1"/> : <ChevronDownIcon className="h-4 w-4 mr-1"/>}
          {isExpanded ? 'Скрыть детали' : 'Показать детали'}
        </Button>
        {isExpanded && (
          <div className="mt-2 pl-2 space-y-2 text-xs border-l-2 border-brand-border">
            {contact.isSupplier && contact.supplierType && <p><strong className="text-brand-text-muted">Тип поставщика:</strong> {contact.supplierType}</p>}
            {contact.city && <p><strong className="text-brand-text-muted">Город:</strong> {contact.city}</p>}
            {contact.address && <p><strong className="text-brand-text-muted">Адрес:</strong> {contact.address}</p>}
            {contact.socialMedia && Object.values(contact.socialMedia).some(v => v) && (
              <div className="flex items-center space-x-2">
                {/* FIX: Explicitly type [platform, link] to prevent `link` from being `unknown`. */}
                {Object.entries(contact.socialMedia).map(([platform, link]: [string, string | undefined]) => {
                  if (link) {
                    const platformInfo = SOCIAL_MEDIA_PLATFORMS[platform as keyof SocialMediaLinks];
                    if (!platformInfo) return null;
                    const IconCmp = platformInfo.icon;
                    const fullUrl = platformInfo.baseUrl ? (link.startsWith('http') || link.startsWith('+') ? link : `${platformInfo.baseUrl}${link.replace('@','')}`) : link;
                    return (
                        <Tooltip key={platform} text={platformInfo.label} position="top">
                          <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="text-brand-text-muted hover:text-brand-primary">
                            <IconCmp className="h-4 w-4"/>
                          </a>
                        </Tooltip>
                    );
                  }
                  return null;
                })}
              </div>
            )}
            {(contact.requisites?.name || contact.requisites?.inn) && (
              <div className="pt-2 border-t border-brand-border/50">
                 <h5 className="font-semibold text-brand-text-secondary mb-1">Реквизиты:</h5>
                 {REQUISITE_FIELDS.map(key => {
                     const value = contact.requisites?.[key as keyof typeof contact.requisites];
                     if (!value) return null;
                     return (
                         <p key={key}><strong className="text-brand-text-muted">{REQUISITE_LABELS[key as keyof typeof REQUISITE_LABELS]}:</strong> <span className="text-brand-text-primary">{value}</span></p>
                     );
                 })}
              </div>
            )}
            {contact.notes && <p className="italic"><strong className="text-brand-text-muted">Заметки:</strong> {contact.notes}</p>}
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-brand-border flex justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="ghost" onClick={() => onView(contact)}><PencilSquareIcon className="h-5 w-5 mr-1" /> Открыть</Button>
      </div>
    </Card>
  );
};

export default MobileContactCard;
