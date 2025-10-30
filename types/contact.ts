// types/contact.ts

export interface Requisites {
  name?: string;
  legalAddress?: string;
  inn?: string;
  ogrn?: string;
  bankAccount?: string;
  bankName?: string;
  bik?: string;
  city?: string;
  correspondentAccount?: string;
  okpo?: string;
  oktmo?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export type CompanyRequisites = Requisites;

export interface SocialMediaLinks {
  instagram?: string;
  telegram?: string;
  whatsapp?: string;
  vk?: string;
  tiktok?: string;
}

export type ContactPriority = '1' | '2' | '3';

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  city?: string;
  address?: string;
  socialMedia?: SocialMediaLinks;
  requisites?: Requisites;
  deliveryRequisites?: string;
  contractFileUrl?: string;
  priority: ContactPriority | null;
  isClient?: boolean;
  isSupplier?: boolean;
  supplierType?: string;
  isArchived: boolean;
  archivedAt?: string;
  notes?: string;
  isMoscowDelivery?: boolean;
}

export type SortableContactKeys = 'name' | 'companyName' | 'city' | 'priority';