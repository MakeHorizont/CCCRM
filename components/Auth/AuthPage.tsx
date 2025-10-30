
import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthPage: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);

  const toggleView = () => setIsLoginView(!isLoginView);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-background px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-brand-surface p-8 sm:p-10 rounded-xl border border-brand-border">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-brand-text-primary">
            {isLoginView ? 'Вход в систему' : 'Создать аккаунт'}
          </h2>
        </div>
        {isLoginView ? <LoginForm /> : <RegisterForm />}
        <div className="text-sm text-center">
          <button
            onClick={toggleView}
            className="font-medium text-sky-600 hover:text-sky-500 transition-colors"
          >
            {isLoginView ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;