
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useView } from '../../hooks/useView';
import { apiService } from '../../services/apiService';
import { SearchResult } from '../../services/api/searchService';
import { 
    MagnifyingGlassIcon, XMarkIcon, IdentificationIcon, ShoppingCartIcon, 
    CubeTransparentIcon, ViewColumnsIcon, BrainCircuitIcon, ChevronRightIcon 
} from '../UI/Icons';
import LoadingSpinner from '../UI/LoadingSpinner';

const GlobalSearchModal: React.FC = () => {
    const { isGlobalSearchOpen, closeGlobalSearch } = useView();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isGlobalSearchOpen) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
            // Focus input after a short delay to allow modal animation
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isGlobalSearchOpen]);

    // Debounced search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length >= 2) {
                setIsLoading(true);
                try {
                    const data = await apiService.globalSearch(query);
                    setResults(data);
                    setSelectedIndex(0);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            closeGlobalSearch();
        }
    };

    const handleSelect = (result: SearchResult) => {
        closeGlobalSearch();
        navigate(result.link);
    };
    
    const getIcon = (type: SearchResult['type']) => {
        switch(type) {
            case 'contact': return <IdentificationIcon className="h-5 w-5 text-blue-400"/>;
            case 'order': return <ShoppingCartIcon className="h-5 w-5 text-emerald-400"/>;
            case 'product': return <CubeTransparentIcon className="h-5 w-5 text-orange-400"/>;
            case 'task': return <ViewColumnsIcon className="h-5 w-5 text-purple-400"/>;
            case 'wiki': return <BrainCircuitIcon className="h-5 w-5 text-zinc-400"/>;
            default: return <MagnifyingGlassIcon className="h-5 w-5 text-gray-400"/>;
        }
    };

    if (!isGlobalSearchOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto p-4 sm:p-20 md:p-20" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-gray-500/75 dark:bg-black/80 transition-opacity backdrop-blur-sm" 
                aria-hidden="true" 
                onClick={closeGlobalSearch}
            ></div>

            {/* Modal Panel */}
            <div className="relative mx-auto max-w-2xl transform divide-y divide-brand-border overflow-hidden rounded-xl bg-brand-card shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
                <div className="relative flex items-center p-4">
                    <MagnifyingGlassIcon className="pointer-events-none h-6 w-6 text-brand-text-muted" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="h-full w-full border-0 bg-transparent pl-4 pr-4 text-brand-text-primary placeholder-brand-text-muted focus:ring-0 sm:text-sm"
                        placeholder="Поиск... (Заказы, Контакты, Товары, Задачи)"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button onClick={closeGlobalSearch} className="text-brand-text-muted hover:text-brand-text-primary">
                         <XMarkIcon className="h-5 w-5"/>
                    </button>
                </div>

                {isLoading && (
                    <div className="py-14 flex justify-center">
                        <LoadingSpinner />
                    </div>
                )}

                {results.length > 0 && !isLoading && (
                    <ul className="max-h-96 scroll-py-2 overflow-y-auto py-2 text-sm text-brand-text-secondary custom-scrollbar-thin">
                        {results.map((result, index) => (
                            <li
                                key={result.id + result.type}
                                className={`cursor-pointer select-none px-4 py-2 flex items-center justify-between ${index === selectedIndex ? 'bg-brand-primary text-white' : 'hover:bg-brand-secondary'}`}
                                onClick={() => handleSelect(result)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`flex-shrink-0 ${index === selectedIndex ? 'text-white' : ''}`}>
                                        {getIcon(result.type)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`font-medium ${index === selectedIndex ? 'text-white' : 'text-brand-text-primary'}`}>
                                            {result.title}
                                        </span>
                                        {result.subtitle && (
                                            <span className={`text-xs ${index === selectedIndex ? 'text-blue-100' : 'text-brand-text-muted'}`}>
                                                {result.subtitle}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {index === selectedIndex && (
                                    <ChevronRightIcon className="h-4 w-4 text-white"/>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {query !== '' && results.length === 0 && !isLoading && (
                    <p className="p-4 text-center text-sm text-brand-text-muted">Ничего не найдено.</p>
                )}
                
                <div className="bg-brand-surface px-4 py-2 text-xs text-brand-text-muted flex justify-between items-center">
                    <span><strong>Enter</strong> для выбора</span>
                    <span><strong>↑↓</strong> для навигации</span>
                    <span><strong>Esc</strong> для закрытия</span>
                </div>
            </div>
        </div>
    );
};

export default GlobalSearchModal;
