
import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { LeanDashboardData } from '../../types';
import LoadingSpinner from '../UI/LoadingSpinner';
import { BoltIcon, ArrowPathIcon } from '../UI/Icons';
import ValueStreamMap from './ValueStreamMap';
import LossAnalysisWidget from './LossAnalysisWidget';
import OEEWidget from './OEEWidget';
import Button from '../UI/Button';

const LeanPage: React.FC = () => {
    const [data, setData] = useState<LeanDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const result = await apiService.getLeanDashboardData();
            setData(result);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (isLoading) return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
    if (!data) return <p className="text-center p-8">Данные не найдены.</p>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
                    <BoltIcon className="h-8 w-8 mr-3 text-brand-primary"/>
                    Бережливое Производство
                </h1>
                <Button variant="secondary" size="sm" onClick={fetchData} leftIcon={<ArrowPathIcon className="h-4 w-4"/>}>
                    Обновить данные
                </Button>
            </div>
            
            <p className="text-brand-text-secondary max-w-4xl">
                Инструменты для анализа потерь и повышения эффективности потока создания ценности. 
                <span className="italic ml-1">"Сэкономленная минута — это минута, подаренная будущему."</span>
            </p>

            <ValueStreamMap stages={data.valueStream} efficiency={data.processEfficiency} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LossAnalysisWidget losses={data.losses} />
                <OEEWidget metrics={data.oee} />
            </div>
        </div>
    );
};

export default LeanPage;
