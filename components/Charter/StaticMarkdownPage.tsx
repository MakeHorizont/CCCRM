import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import MarkdownDisplay from '../UI/MarkdownDisplay';

interface StaticMarkdownPageProps {
    source: 'charter' | 'evolution';
}

const StaticMarkdownPage: React.FC<StaticMarkdownPageProps> = ({ source }) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            setError(null);
            try {
                let markdownContent: string | null;
                if (source === 'charter') {
                    markdownContent = await apiService.getCharterContent();
                } else {
                    markdownContent = await apiService.getModernizationContent();
                }
                setContent(markdownContent || '');
            } catch (err) {
                setError('Не удалось загрузить содержимое страницы.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchContent();
    }, [source]);

    return (
        <Card>
            {isLoading ? (
                <div className="flex justify-center p-8"><LoadingSpinner /></div>
            ) : error ? (
                <p className="text-red-500 text-center">{error}</p>
            ) : (
                <MarkdownDisplay markdown={content} />
            )}
        </Card>
    );
};

export default StaticMarkdownPage;
