
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../constants';

const RegisterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register, error: authError, isLoading } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email || !password || !confirmPassword) {
      setFormError('Пожалуйста, заполните все поля.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Пароли не совпадают.');
      return;
    }
    try {
      await register({ email, password, name: email.split('@')[0] }); // Simple name generation
      navigate(ROUTE_PATHS.DASHBOARD);
    } catch (err) {
      setFormError((err as Error).message || 'Ошибка регистрации. Попробуйте еще раз.');
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {formError && <p className="text-red-500 text-sm text-center">{formError}</p>}
      {authError && !formError && <p className="text-red-500 text-sm text-center">{authError}</p>}
      <Input
        id="email-register"
        name="email"
        type="email"
        label="Электронная почта"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <Input
        id="password-register"
        name="password"
        type="password"
        label="Пароль"
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />
      <Input
        id="confirm-password-register"
        name="confirmPassword"
        type="password"
        label="Подтвердите пароль"
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="••••••••"
      />
      <div>
        <Button type="submit" fullWidth isLoading={isLoading}>
          Зарегистрироваться
        </Button>
      </div>
    </form>
  );
};

export default RegisterForm;