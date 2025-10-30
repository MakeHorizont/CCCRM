import React, { useState, useEffect } from 'react';
import Card from '../UI/Card';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { useAuth } from '../../hooks/useAuth';
import { UserCircleIcon, EnvelopeIcon, LockClosedIcon, BuildingOfficeIcon, SunIcon, MoonIcon, SparklesIcon } from '../UI/Icons';
import { apiService } from '../../services/apiService';
import { CompanyRequisites, Requisites } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppSettings } from '../../hooks/useAppSettings';
import ToggleSwitch from '../UI/ToggleSwitch';

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

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isAIAssistantEnabled, toggleAIAssistant } = useAppSettings();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [companyRequisites, setCompanyRequisites] = useState<Partial<CompanyRequisites>>({});

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingRequisites, setIsSavingRequisites] = useState(false);

  const [profileMessage, setProfileMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [requisitesMessage, setRequisitesMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const fetchRequisites = async () => {
        try {
            const data = await apiService.getCompanyRequisites();
            setCompanyRequisites(data || {});
        } catch (error) {
            setRequisitesMessage({ type: 'error', text: 'Не удалось загрузить реквизиты компании.' });
        }
    };
    fetchRequisites();
  }, []);


  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage(null);
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (name && email) {
        console.log('Profile updated:', { name, email });
        setProfileMessage({type: 'success', text: 'Профиль успешно обновлен.'});
    } else {
        setProfileMessage({type: 'error', text: 'Ошибка обновления профиля.'});
    }
    setIsSavingProfile(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage({type: 'error', text: 'Новые пароли не совпадают.'});
      return;
    }
    if (!currentPassword || !newPassword) {
      setPasswordMessage({type: 'error', text: 'Заполните все поля для смены пароля.'});
      return;
    }
    setIsSavingPassword(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (currentPassword === "password123") {
        setPasswordMessage({type: 'success', text: 'Пароль успешно изменен.'});
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
    } else {
        setPasswordMessage({type: 'error', text: 'Текущий пароль неверен.'});
    }
    setIsSavingPassword(false);
  };
  
  const handleRequisitesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCompanyRequisites(prev => ({ ...prev, [name]: value }));
  };

  const handleRequisitesSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingRequisites(true);
      setRequisitesMessage(null);
      try {
          await apiService.updateCompanyRequisites(companyRequisites as CompanyRequisites);
          setRequisitesMessage({ type: 'success', text: 'Реквизиты компании успешно сохранены.' });
      } catch (err) {
          setRequisitesMessage({ type: 'error', text: (err as Error).message || 'Ошибка сохранения реквизитов.' });
      } finally {
          setIsSavingRequisites(false);
      }
  };


  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold text-brand-text-primary">Настройки</h1>

      <Card>
        <h2 className="text-xl font-semibold text-brand-text-primary border-b border-brand-border pb-2 mb-4">Внешний вид</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant={theme === 'light' ? 'primary' : 'secondary'}
            onClick={() => setTheme('light')}
            leftIcon={<SunIcon className="h-5 w-5" />}
          >
            Светлая
          </Button>
          <Button
            variant={theme === 'dark' ? 'primary' : 'secondary'}
            onClick={() => setTheme('dark')}
            leftIcon={<MoonIcon className="h-5 w-5" />}
          >
            Тёмная
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-brand-text-primary border-b border-brand-border pb-2 mb-4 flex items-center">
            <SparklesIcon className="h-5 w-5 mr-2 text-sky-400"/>
            Интеграции и Функции
        </h2>
        <div className="flex items-center justify-between">
            <div>
                <h3 className="font-medium text-brand-text-primary">AI Ассистент</h3>
                <p className="text-xs text-brand-text-muted">Включает плавающий виджет с чатом для помощи в работе с системой.</p>
            </div>
            <ToggleSwitch
                id="ai-assistant-toggle"
                label={isAIAssistantEnabled ? 'Включен' : 'Выключен'}
                checked={isAIAssistantEnabled}
                onChange={toggleAIAssistant}
            />
        </div>
      </Card>
      
      <Card>
        <form onSubmit={handleRequisitesSave} className="space-y-6">
           <h2 className="text-xl font-semibold text-brand-text-primary border-b border-brand-border pb-2">Реквизиты Компании</h2>
            {requisitesMessage && <p className={`text-sm ${requisitesMessage.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>{requisitesMessage.text}</p>}
            <p className="text-xs text-brand-text-muted">Эти данные будут использоваться для автоматической подстановки в счета, накладные и другие документы.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                 {REQUISITE_FIELDS.map(key => (
                    <Input
                        key={String(key)}
                        id={`company-requisites-${key}`}
                        name={key as string}
                        label={REQUISITE_LABELS[key]}
                        value={companyRequisites[key as keyof CompanyRequisites] || ''}
                        onChange={handleRequisitesChange}
                        icon={<BuildingOfficeIcon className="h-5 w-5 text-brand-text-muted"/>}
                    />
                ))}
            </div>
             <div className="flex justify-end">
                <Button type="submit" isLoading={isSavingRequisites}>Сохранить реквизиты</Button>
            </div>
        </form>
      </Card>

      <Card>
        <form onSubmit={handleProfileSave} className="space-y-6">
          <h2 className="text-xl font-semibold text-brand-text-primary border-b border-brand-border pb-2">Профиль пользователя</h2>
          {profileMessage && <p className={`text-sm ${profileMessage.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>{profileMessage.text}</p>}
          <Input
            id="name"
            label="Имя"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<UserCircleIcon className="h-5 w-5 text-brand-text-muted"/>}
          />
          <Input
            id="email"
            label="Электронная почта"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<EnvelopeIcon className="h-5 w-5 text-brand-text-muted"/>}
            disabled // Typically email is not changed or requires verification
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={isSavingProfile}>Сохранить профиль</Button>
          </div>
        </form>
      </Card>

      <Card>
        <form onSubmit={handlePasswordChange} className="space-y-6">
          <h2 className="text-xl font-semibold text-brand-text-primary border-b border-brand-border pb-2">Изменить пароль</h2>
          {passwordMessage && <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>{passwordMessage.text}</p>}
          <Input
            id="currentPassword"
            label="Текущий пароль"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            icon={<LockClosedIcon className="h-5 w-5 text-brand-text-muted"/>}
          />
          <Input
            id="newPassword"
            label="Новый пароль"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            icon={<LockClosedIcon className="h-5 w-5 text-brand-text-muted"/>}
          />
          <Input
            id="confirmNewPassword"
            label="Подтвердите новый пароль"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            icon={<LockClosedIcon className="h-5 w-5 text-brand-text-muted"/>}
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={isSavingPassword}>Изменить пароль</Button>
          </div>
        </form>
      </Card>
      
    </div>
  );
};

export default SettingsPage;