// services/api/contactService.ts
import { Contact, SortableContactKeys } from '../../types';
import { mockContacts } from '../mockData/contacts';
import { delay, deepCopy, sortData } from './utils';

type SortConfig<T> = { key: keyof T, direction: 'asc' | 'desc' } | null;

const getContacts = (filters: { searchTerm?: string; viewMode?: 'active' | 'archived' | 'all'; sortConfig?: SortConfig<Contact>; type?: 'all' | 'client' | 'supplier' }): Promise<Contact[]> => {
    return new Promise((resolve) => {
      delay(300).then(() => {
        let filteredContacts = deepCopy(mockContacts);
        if (filters.viewMode === 'archived') {
            filteredContacts = filteredContacts.filter(c => c.isArchived);
        } else if (filters.viewMode === 'active' || !filters.viewMode) { // Default to active if undefined
            filteredContacts = filteredContacts.filter(c => !c.isArchived);
        }
        // If viewMode is 'all', we don't filter by archive status
        
        if (filters.type === 'client') {
            filteredContacts = filteredContacts.filter(c => c.isClient);
        } else if (filters.type === 'supplier') {
            filteredContacts = filteredContacts.filter(c => c.isSupplier);
        }

        if (filters.searchTerm) {
          const lowercasedFilter = filters.searchTerm.toLowerCase();
          filteredContacts = filteredContacts.filter(contact =>
            contact.name.toLowerCase().includes(lowercasedFilter) ||
            (contact.companyName && contact.companyName.toLowerCase().includes(lowercasedFilter)) ||
            (contact.email && contact.email.toLowerCase().includes(lowercasedFilter)) ||
            (contact.phone && contact.phone.includes(lowercasedFilter)) ||
            (contact.requisites?.inn && contact.requisites.inn.includes(lowercasedFilter))
          );
        }
        
        resolve(sortData(filteredContacts, filters.sortConfig || { key: 'name', direction: 'asc' }));
      });
    });
};
  
const updateContact = (contactData: Contact): Promise<Contact> => {
      return new Promise((resolve, reject) => {
          delay(500).then(() => {
              const index = mockContacts.findIndex(c => c.id === contactData.id);
              if (index !== -1) {
                  mockContacts[index] = { ...mockContacts[index], ...contactData };
                  resolve(deepCopy(mockContacts[index]));
              } else {
                  reject(new Error('Contact not found'));
              }
          });
      });
};

const addContact = (contactData: Omit<Contact, 'id' | 'isArchived' | 'archivedAt'>): Promise<Contact> => {
      return new Promise((resolve) => {
          delay(500).then(() => {
              const newContact: Contact = {
                  id: `contact${Date.now()}`,
                  isArchived: false,
                  ...contactData,
              };
              mockContacts.push(newContact);
              resolve(deepCopy(newContact));
          });
      });
};

const archiveContact = (contactId: string, archive: boolean): Promise<{ success: true }> => {
      return new Promise((resolve, reject) => {
          delay(300).then(() => {
              const index = mockContacts.findIndex(c => c.id === contactId);
              if (index !== -1) {
                  mockContacts[index].isArchived = archive;
                  mockContacts[index].archivedAt = archive ? new Date().toISOString() : undefined;
                  resolve({ success: true });
              } else {
                  reject(new Error('Contact not found'));
              }
          });
      });
};
  
const deleteContact = (contactId: string): Promise<{ success: true }> => {
    return new Promise((resolve, reject) => {
        delay(500).then(() => {
            const index = mockContacts.findIndex(c => c.id === contactId);
            if (index !== -1 && mockContacts[index].isArchived) {
                mockContacts.splice(index, 1);
                resolve({ success: true });
            } else if (index === -1) {
                reject(new Error('Contact not found'));
            } else {
                reject(new Error('Contact must be archived before deletion'));
            }
        });
    });
};

export const contactApi = {
    getContacts,
    updateContact,
    addContact,
    archiveContact,
    deleteContact
};