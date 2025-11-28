
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../constants';

const LoginForm: React.FC = () => {
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Changed from email
  const [password, setPassword] = useState('');
  const { login, error: authError, isLoading } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!loginIdentifier || !password) {
      setFormError('Пожалуйста, заполните все поля.');
      return;
    }
    try {
      // Pass loginIdentifier as email to the auth service, it will handle logic
      await login({ email: loginIdentifier, password }); 
      navigate(ROUTE_PATHS.DASHBOARD);
    } catch (err) {
      // Error is already set in authContext, but can add more specific form error if needed
      setFormError( (err as Error).message || 'Ошибка входа. Пожалуйста, проверьте свои данные.');
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {formError && <p className="text-red-500 text-sm text-center">{formError}</p>}
      {authError && !formError && <p className="text-red-500 text-sm text-center">{authError}</p>}
      
      <Input
        id="login-identifier"
        name="loginIdentifier" // Changed name for clarity, can also be "username"
        type="text" // Changed type to text to allow non-email format for username
        label="Электронная почта / Логин" // Updated label
        autoComplete="username email" // Updated autocomplete hint
        required
        value={loginIdentifier}
        onChange={(e) => setLoginIdentifier(e.target.value)}
        placeholder="you@example.com или ваш_логин"
      />
      <Input
        id="password-login"
        name="password"
        type="password"
        label="Пароль"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />
      <div>
        <Button type="submit" fullWidth isLoading={isLoading}>
          Войти
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;