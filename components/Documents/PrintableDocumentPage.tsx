import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { Document } from '../../types';
import LoadingSpinner from '../UI/LoadingSpinner';

const PrintableDocumentPage: React.FC = () => {
    const { documentId } = useParams<{ documentId: string }>();
    const [document, setDocument] = useState<Document | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!documentId) {
            setError("ID документа не указан.");
            setIsLoading(false);
            return;
        }
        
        const fetchDocument = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await apiService.getDocumentById(documentId);
                if (data) {
                    setDocument(data);
                } else {
                    setError("Документ не найден.");
                }
            } catch (err) {
                setError("Ошибка загрузки документа.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDocument();
    }, [documentId]);
    
    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-white"><LoadingSpinner /></div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-700 bg-red-100">{error}</div>;
    }
    
    if (!document) {
        return <div className="text-center p-8 text-gray-600">Документ не найден.</div>;
    }
    
    const docTitle = document.type === 'invoice' ? 'Счет на оплату' : 'Товарная накладная';

    const renderRequisites = (title: string, requisites: any) => (
        <div>
            <h2 className="text-sm font-bold border-b border-gray-400 pb-1 mb-2">{title}</h2>
            <p className="text-xs"><strong>{requisites.name || 'Название не указано'}</strong></p>
            <p className="text-xs">Юр. адрес: {requisites.legalAddress || '-'}</p>
            <p className="text-xs">ИНН/КПП: {requisites.inn || '-'} / {requisites.kpp || ''}</p>
            <p className="text-xs">Р/с: {requisites.bankAccount || '-'}</p>
            <p className="text-xs">Банк: {requisites.bankName || '-'}</p>
            <p className="text-xs">БИК: {requisites.bik || '-'}</p>
            <p className="text-xs">К/с: {requisites.correspondentAccount || '-'}</p>
        </div>
    );
    
    const numberToWords = (num: number): string => {
        // This is a very simplified implementation. A real app would use a library.
        const fixedNum = num.toFixed(2);
        const [rubles, kopecks] = fixedNum.split('.');
        return `${rubles} руб. ${kopecks} коп.`;
    };

    return (
        <div className="bg-white text-black p-4 sm:p-8 font-sans printable-area">
            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none; }
                }
                .printable-area { max-width: 800px; margin: auto; }
            `}</style>
            
            <div className="no-print mb-4 text-center">
                <button onClick={() => window.print()} className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600">Печать</button>
                <button onClick={() => window.close()} className="px-4 py-2 bg-gray-200 text-black rounded hover:bg-gray-300 ml-2">Закрыть</button>
            </div>

            <div className="text-center mb-4">
                <p className="text-xs">{document.ourRequisites.name}</p>
                <p className="text-xs">Адрес: {document.ourRequisites.legalAddress}, Тел: {document.ourRequisites.phone}</p>
            </div>
            
            <h1 className="text-2xl font-bold text-center my-6">{docTitle} № {document.number} от {new Date(document.date).toLocaleDateString('ru-RU')}</h1>
            
            <div className="grid grid-cols-2 gap-8 text-sm mb-6">
                {renderRequisites("Поставщик:", document.ourRequisites)}
                {renderRequisites("Покупатель:", document.customerRequisites)}
            </div>

            <table className="w-full text-xs border-collapse border border-gray-400">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border border-gray-400 p-1">№</th>
                        <th className="border border-gray-400 p-1 text-left">Наименование товара</th>
                        <th className="border border-gray-400 p-1">Кол-во</th>
                        <th className="border border-gray-400 p-1">Ед.</th>
                        <th className="border border-gray-400 p-1 text-right">Цена</th>
                        <th className="border border-gray-400 p-1 text-right">Сумма</th>
                    </tr>
                </thead>
                <tbody>
                    {document.items.map((item, index) => (
                        <tr key={item.id}>
                            <td className="border border-gray-400 p-1 text-center">{index + 1}</td>
                            <td className="border border-gray-400 p-1">{item.productName}</td>
                            <td className="border border-gray-400 p-1 text-center">{item.quantity}</td>
                            <td className="border border-gray-400 p-1 text-center">шт.</td>
                            <td className="border border-gray-400 p-1 text-right">{item.pricePerUnit.toFixed(2)}</td>
                            <td className="border border-gray-400 p-1 text-right">{(item.quantity * item.pricePerUnit).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={5} className="text-right font-bold p-1">Итого:</td>
                        <td className="text-right font-bold p-1">{document.totalAmount.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colSpan={5} className="text-right font-bold p-1">Без налога (НДС)</td>
                        <td className="text-right font-bold p-1">-</td>
                    </tr>
                    <tr>
                        <td colSpan={5} className="text-right font-bold p-1">Всего к оплате:</td>
                        <td className="text-right font-bold p-1">{document.totalAmount.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>

            <p className="text-sm mt-2">
                Всего наименований {document.items.length}, на сумму {document.totalAmount.toFixed(2)} руб.
            </p>
            <p className="text-sm font-bold">{numberToWords(document.totalAmount)}</p>

            <div className="mt-8 pt-8 border-t-2 border-black flex justify-between text-sm">
                <div>
                    <p className="font-bold mb-4">Руководитель _________________ / {document.ourRequisites.name?.split(' ')[1] || ' '}</p>
                </div>
                <div>
                     <p className="font-bold mb-4">Бухгалтер _________________ / {document.ourRequisites.name?.split(' ')[1] || ' '}</p>
                </div>
            </div>
        </div>
    );
};

export default PrintableDocumentPage;