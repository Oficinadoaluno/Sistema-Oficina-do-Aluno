import React, { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { UserRole, Collaborator, Professional } from './types';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import { auth, db, FIREBASE_CONFIG_MISSING } from './firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon, InformationCircleIcon } from './components/Icons';

type User = firebase.User;

const LoadingScreen: React.FC<{ message?: string }> = ({ message = "Carregando..." }) => (
    <main className="min-h-screen bg-neutral flex items-center justify-center">
        <div className="text-center">
            <div className="w-12 h-12 border-4 border-zinc-200 border-t-secondary rounded-full animate-spin mx-auto"></div>
            <p className="text-xl font-semibold text-zinc-600 mt-4">{message}</p>
        </div>
    </main>
);

const FirebaseConfigError: React.FC = () => (
    <main className="min-h-screen bg-neutral flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-zinc-800">Erro de Configuração</h1>
            <p className="text-zinc-600 mt-2">
                A configuração do Firebase não foi encontrada. A aplicação não pode ser inicializada.
            </p>
            <div className="mt-4 text-left bg-zinc-100 p-4 rounded-md text-sm">
                <p className="font-semibold">Como corrigir:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Se você for um desenvolvedor, certifique-se que o arquivo <code>.env.local</code> contém as variáveis <code>VITE_FIREBASE_*</code>.</li>
                    <li>Ou, adicione o bloco de configuração <code>window.__FIREBASE_CONFIG__</code> no arquivo <code>index.html</code> antes do script da aplicação.</li>
                </ul>
            </div>
        </div>
    </main>
);

type ToastType = 'success' | 'error' | 'info';
interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}
interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}
export const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

const Toast: React.FC<ToastMessage & { onClose: () => void }> = ({ message, type, onClose }) => {
    const theme = {
        success: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', icon: <CheckCircleIcon className="h-6 w-6 text-cyan-500" /> },
        error: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: <ExclamationTriangleIcon className="h-6 w-6 text-red-500" /> },
        info: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', icon: <InformationCircleIcon className="h-6 w-6 text-blue-500" /> }
    };
    const currentTheme = theme[type];
    return (
        <div className={`flex items-start w-full gap-3 p-4 rounded-lg shadow-lg border ${currentTheme.bg} ${currentTheme.border} animate-toast-in`}>
            <div className="flex-shrink-0">{currentTheme.icon}</div>
            <div className={`flex-grow text-sm font-semibold ${currentTheme.text}`}>{message}</div>
            <button type="button" onClick={onClose} className="p-1 -mt-1 -mr-1 rounded-full hover:bg-black/10"><XMarkIcon className="h-5 w-5" /></button>
        </div>
    );
};

const AppRouter: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<Collaborator | Professional | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const { showToast } = useContext(ToastContext);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setLoadingAuth(true);
      setAuthUser(user);
      if (user) {
        try {
            let userDocRef = db.collection("collaborators").doc(user.uid);
            let userDoc = await userDocRef.get();
            if (userDoc.exists) {
                setUserData({ id: userDoc.id, ...userDoc.data() } as Collaborator);
                setSelectedRole(UserRole.Admin);
            } else {
                userDocRef = db.collection("professionals").doc(user.uid);
                userDoc = await userDocRef.get();
                if (userDoc.exists) {
                    setUserData({ id: userDoc.id, ...userDoc.data() } as Professional);
                    setSelectedRole(UserRole.Teacher);
                } else {
                    console.error("User document not found in 'collaborators' or 'professionals' collections.");
                    showToast("Sua conta não foi encontrada. Entre em contato com o suporte.", "error");
                    await auth.signOut();
                    setUserData(null);
                    setSelectedRole(null);
                }
            }
        } catch (error: any) {
            console.error("Firestore Get User Error:", error);
            showToast("Ocorreu um erro ao buscar seus dados de usuário.", "error");
            await auth.signOut();
            setUserData(null);
            setSelectedRole(null);
        }
      } else {
        setUserData(null);
        setSelectedRole(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [showToast]);
  
  const handleLogout = async () => await auth.signOut();

  if (loadingAuth) {
    return <LoadingScreen message="Autenticando..." />;
  }

  if (authUser && userData) {
    if (selectedRole === UserRole.Admin) {
      return <AdminDashboard onLogout={handleLogout} currentUser={userData as Collaborator} />;
    }
    if (selectedRole === UserRole.Teacher) {
      return <TeacherDashboard onLogout={handleLogout} currentUser={userData as Professional} />;
    }
    return <LoadingScreen message="Verificando permissões..." />;
  }
  
  return (
    <main className="min-h-screen bg-neutral flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 sm:p-12 transition-all duration-500 relative">
        <LoginForm />
      </div>
      <footer className="absolute bottom-4 text-zinc-500 text-sm">
        © {new Date().getFullYear()} Oficina do Aluno. Todos os direitos reservados.
      </footer>
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
    </main>
  );
};

const AppWithProviders: React.FC = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    
    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev.slice(-4), { id, message, type }]);
        setTimeout(() => removeToast(id), 5000);
    }, [removeToast]);


    return (
        <ToastContext.Provider value={{ showToast }}>
            <AppRouter />
            <div className="fixed top-6 right-6 z-[100] w-full max-w-sm space-y-3">
                {toasts.map(toast => <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />)}
            </div>
            <style>{`
                @keyframes toast-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
                .animate-toast-in { animation: toast-in 0.3s ease-out forwards; }
            `}</style>
        </ToastContext.Provider>
    );
};

const App: React.FC = () => {
    if (FIREBASE_CONFIG_MISSING) {
        return <FirebaseConfigError />;
    }
    
    return <AppWithProviders />;
};

export default App;