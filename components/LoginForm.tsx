import React, { useState } from 'react';
import { UserRole } from '../types';
import { ArrowLeftIcon } from './Icons';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const LogoPlaceholder: React.FC = () => (
  <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
    <span className="text-2xl font-bold text-primary">OA</span>
  </div>
);

interface LoginFormProps {
  role: UserRole;
  onBack: () => void;
  onLoginSuccess: () => void; // Kept for prop compatibility, but logic is now in App.tsx
}

const themeConfig = {
  [UserRole.Admin]: {
    textColor: 'text-primary',
    focusRingColor: 'focus:ring-primary',
    focusBorderColor: 'focus:border-primary',
    bgColor: 'bg-primary',
    hoverBgColor: 'hover:bg-primary-dark',
  },
  [UserRole.Teacher]: {
    textColor: 'text-secondary',
    focusRingColor: 'focus:ring-secondary',
    focusBorderColor: 'focus:border-secondary',
    bgColor: 'bg-secondary',
    hoverBgColor: 'hover:bg-secondary-dark',
  },
};

const LoginForm: React.FC<LoginFormProps> = ({ role, onBack }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const theme = themeConfig[role] || themeConfig[UserRole.Admin];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Assumption: Usernames are converted to emails for Firebase Auth
    const email = login.includes('@') ? login : `${login}@sistema-oficinadoaluno.com`;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged in App.tsx will handle the rest
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setError('Login ou senha inválidos.');
      } else {
        console.error("Firebase Auth Error:", error);
        setError('Ocorreu um erro ao tentar fazer login. Tente novamente.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full animate-fade-in">
       <button
        onClick={onBack}
        className="absolute top-6 left-6 text-zinc-400 hover:text-zinc-600 transition-colors"
        aria-label="Voltar para seleção de perfil"
        disabled={isLoading}
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </button>
      
      <LogoPlaceholder />

      <div className="text-center">
         <h2 className="text-3xl font-bold text-zinc-800">
            <span className={theme.textColor}>{role}</span>
         </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="login" className="block text-base font-medium text-zinc-600 mb-1">
            Login (Email)
          </label>
          <input
            type="text"
            id="login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className={`w-full px-4 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 ${theme.focusRingColor} ${theme.focusBorderColor} transition-shadow duration-200`}
            placeholder="seu.login@email.com"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-base font-medium text-zinc-600 mb-1">
            Senha
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-4 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 ${theme.focusRingColor} ${theme.focusBorderColor} transition-shadow duration-200`}
            placeholder="********"
            required
            disabled={isLoading}
          />
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105 text-lg ${theme.bgColor} ${theme.hoverBgColor} ${theme.focusRingColor} disabled:bg-zinc-400 disabled:scale-100`}
        >
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
