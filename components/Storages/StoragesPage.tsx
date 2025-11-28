import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import ConfirmationModal from '../UI/ConfirmationModal';
import LoadingSpinner from '../UI/LoadingSpinner';
import { StorageLocation, StorageTag } from '../../types';
import { apiService } from '../../services/apiService';
import { PlusCircleIcon, PencilSquareIcon, ArchiveBoxArrowDownIcon, ArrowUturnLeftIcon, TrashIcon, MagnifyingGlassIcon, CubeIcon, TagIcon, ArchiveBoxIcon as ViewArchiveIcon, XCircleIcon } from '../UI/Icons';
import { TAG_COLORS, getRandomTagColor, ROUTE_PATHS } from '../../constants';
import Tooltip from '../UI/Tooltip';
import { useView } from '../../hooks/useView';

type ViewMode = 'active' | 'archived';

const MobileStorageCard: React.FC<{
  storage: StorageLocation;
  onView: (storage: StorageLocation) => void;
}> = ({ storage, onView }) => {
  return (
    <Card className={`mb-3 ${storage.isArchived ? 'opacity-70 bg-brand-surface' : ''}`} onClick={() => onView(storage)}>
      <h3 className="font-semibold text-brand-text-primary truncate flex items-center">
        {storage.name}
        {storage.equipmentId && (
            <Tooltip text="Это также оборудование">
                <CubeIcon className="h-4 w-4 ml-2 text-indigo-400" />
            </Tooltip>
        )}
      </h3>
      {storage.description && <p className="text-xs text-brand-text-muted mt-1 truncate">{storage.description}</p>}
      {storage.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {storage.tags.map(tag => (
            <span key={tag.id} className={`px-1.5 py-0.5 text-xs rounded-full ${tag.color || 'bg-zinc-600 text-zinc-100'}`}>
              {tag.name}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 pt-2 border-t border-brand-border flex justify-end space-x-2" onClick={e => e.stopPropagation()}>
        <Button size="sm" variant="ghost" onClick={() => onView(storage)}>
            <PencilSquareIcon className="h-5 w-5 mr-1" /> Открыть
        </Button>
      </div>
    </Card>
  );
};


const StoragesPage: React.FC = () => {
  const { isMobileView } = useView();
  const navigate = useNavigate();
  const [storages, setStorages] = useState<StorageLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [searchTerm, setSearchTerm] = useState('');


  const fetchStorages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const storagesData = await apiService.getStorageLocations({ searchTerm, viewMode });
      setStorages(storagesData);
    } catch (err) {
      setError(`Не удалось загрузить данные хранилищ.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, viewMode]);

  useEffect(() => {
    fetchStorages();
  }, [fetchStorages]);

  const handleOpenEditor = (storage?: StorageLocation) => {
    const path = storage ? `${ROUTE_PATHS.STORAGES}/${storage.id}` : `${ROUTE_PATHS.STORAGES}/new`;
    navigate(path);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary mb-4 sm:mb-0 flex items-center">
          <CubeIcon className="h-8 w-8 mr-3 text-brand-primary" />
          {viewMode === 'active' ? 'Хранилища' : 'Архив Хранилищ'}
        </h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <Button
            onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')}
            variant="secondary"
            leftIcon={<ViewArchiveIcon className="h-5 w-5"/>}
            fullWidth={isMobileView}
          >
            {viewMode === 'active' ? 'Архив' : 'Актуальные'}
          </Button>
          {viewMode === 'active' && (
            <Button onClick={() => handleOpenEditor()} variant="primary" fullWidth={isMobileView}>
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Добавить Хранилище
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="mb-4">
          <Input
            id="storages-search"
            type="text"
            placeholder="Поиск по названию, описанию, тегам..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted"/>}
          />
        </div>

        {isLoading && <div className="flex justify-center p-8"><LoadingSpinner /></div>}
        {error && <p className="text-red-500 text-center p-4">{error}</p>}

        {!isLoading && !error && (
          storages.length > 0 ? (
            isMobileView ? (
              <div>
                {storages.map(storage => (
                  <MobileStorageCard
                    key={storage.id}
                    storage={storage}
                    onView={handleOpenEditor}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-brand-text-secondary">
                  <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                    <tr>
                      <th scope="col" className="px-6 py-3 min-w-[200px]">Название</th>
                      <th scope="col" className="px-6 py-3 min-w-[250px]">Описание</th>
                      <th scope="col" className="px-6 py-3 min-w-[200px]">Теги</th>
                      <th scope="col" className="px-6 py-3 min-w-[120px]">Обновлено</th>
                      <th scope="col" className="px-6 py-3 text-center min-w-[120px]">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {storages.map(storage => (
                      <tr key={storage.id} className="hover:bg-brand-secondary transition-colors cursor-pointer" onClick={() => handleOpenEditor(storage)}>
                        <td className="px-6 py-4 font-medium text-brand-text-primary flex items-center">
                          {storage.name}
                          {storage.equipmentId && (
                            <Tooltip text="Перейти к оборудованию">
                                <Link to={`${ROUTE_PATHS.EQUIPMENT}?equipId=${storage.equipmentId}`} onClick={e => e.stopPropagation()} className="ml-2">
                                    <CubeIcon className="h-4 w-4 text-indigo-400 hover:text-indigo-300" />
                                </Link>
                            </Tooltip>
                          )}
                        </td>
                        <td className="px-6 py-4 truncate max-w-md" title={storage.description}>{storage.description || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {storage.tags.map(tag => (
                              <span key={tag.id} className={`px-1.5 py-0.5 text-xs rounded-full ${tag.color || 'bg-zinc-600 text-zinc-100'}`}>
                                {tag.name}
                              </span>
                            ))}
                            {storage.tags.length === 0 && '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">{new Date(storage.updatedAt).toLocaleDateString('ru-RU')}</td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-1">
                            <Tooltip text="Просмотр/Редактирование">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEditor(storage)} aria-label="Просмотр/Редактирование">
                                <PencilSquareIcon className="h-5 w-5" />
                              </Button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="text-center p-8 text-brand-text-muted">
              <CubeIcon className="h-12 w-12 mx-auto mb-2" />
              <p>{viewMode === 'active' ? 'Хранилища не найдены.' : 'Архивные хранилища не найдены.'}</p>
              {searchTerm && <p className="text-sm">Попробуйте изменить условия поиска.</p>}
            </div>
          )
        )}
      </Card>

       <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: #3f3f46; 
          border-radius: 3px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #52525b; 
        }
      `}</style>
    </div>
  );
};

export default StoragesPage;