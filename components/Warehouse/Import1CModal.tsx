
import React, { useState, useCallback } from 'react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { DocumentArrowUpIcon } from '../UI/Icons';

interface Import1CModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

const Import1CModal: React.FC<Import1CModalProps> = ({ isOpen, onClose, onImportSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError(null); // Clear previous errors
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Пожалуйста, выберите файл для импорта.');
      return;
    }
    setIsImporting(true);
    setError(null);
    // Simulate API call for import
    try {
      // In a real app: await apiService.import1CFile(selectedFile);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
      console.log('Importing file:', selectedFile.name);
      onImportSuccess();
    } catch (err) {
      setError('Ошибка импорта файла. Пожалуйста, попробуйте еще раз.');
      console.error('Import error:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setIsImporting(false);
    setError(null);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };
  
  // Call resetState when modal is opened too, if it was previously used
  React.useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);


  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Импорт данных из 1С">
      <div className="space-y-4">
        <p className="text-sm text-brand-text-secondary">
          Выберите файл в формате, выгруженном из 1С (например, .xml или .csv).
        </p>
        
        <div>
          <label htmlFor="file-upload" className="block text-sm font-medium text-brand-text-primary mb-1">
            Файл для импорта
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-brand-border border-dashed rounded-md bg-brand-surface">
            <div className="space-y-1 text-center">
              <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-brand-text-muted" />
              <div className="flex text-sm text-brand-text-secondary">
                <label
                  htmlFor="file-upload-input"
                  className="relative cursor-pointer bg-brand-surface rounded-md font-medium text-sky-400 hover:text-sky-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-brand-card focus-within:ring-sky-500"
                >
                  <span>Загрузите файл</span>
                  <input id="file-upload-input" name="file-upload-input" type="file" className="sr-only" onChange={handleFileChange} accept=".xml,.csv,.txt" />
                </label>
                <p className="pl-1">или перетащите сюда</p>
              </div>
              <p className="text-xs text-brand-text-muted">XML, CSV, TXT до 10MB</p>
            </div>
          </div>
          {selectedFile && (
            <p className="mt-2 text-sm text-brand-text-primary">Выбранный файл: {selectedFile.name}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="secondary" onClick={handleClose} disabled={isImporting}>
            Отмена
          </Button>
          <Button onClick={handleImport} isLoading={isImporting} disabled={!selectedFile}>
            Импортировать
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Import1CModal;
