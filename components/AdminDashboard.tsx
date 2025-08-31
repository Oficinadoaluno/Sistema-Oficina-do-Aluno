
import React, { useState, useRef, useEffect, useContext } from 'react';
import StudentList from './StudentList';
import ProfessionalList from './ProfessionalList';
import AgendaView from './AgendaView';
import ClassGroupView from './ClassGroupView';
import SettingsView from './SettingsView';
import FinancialView from './FinancialView';
import { Collaborator, Transaction } from '../types'; 
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ToastContext } from '../App';
import { 
    LogoPlaceholder, UserIcon, ChevronDownIcon, BirthdayIcon, AlertIcon, BookOpenIcon, UsersIcon, 
    CurrencyDollarIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, UserPlusIcon, 
    DocumentTextIcon, IdentificationIcon, LockClosedIcon, BanknotesIcon, XMarkIcon, CalendarDaysIcon
} from './Icons';

// --- Helper Functions ---
const calculateAge = (birthDateString?: string): number | null => {
    if (!birthDateString) return null;
    try {
        const birthDate = new Date(birthDateString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    } catch (e) {
        return null;
    }
};

// --- Profile Modals ---
const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

const UserProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; user: Collaborator }> = ({ isOpen, onClose, user }) => {
    const { showToast } = useContext(ToastContext);
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [address, setAddress] = useState(user.address || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const userRef = doc(db, "collaborators", user.id);
            await updateDoc(userRef, { name, email, phone, address });
            showToast('Dados atualizados com sucesso!', 'success');
            onClose();
        } catch (error) {
            console.error("Error updating user profile:", error);
            showToast("Ocorreu um erro ao salvar os dados.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <form className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4" onClick={e => e.stopPropagation()} onSubmit={handleSave}>
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Alterar Dados</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="admin-name" className={labelStyle}>Nome</label>
                        <input id="admin-name" type="text" className={inputStyle} value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="admin-email" className={labelStyle}>Email</label>
                        <input id="admin-email" type="email" className={inputStyle} value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="admin-phone" className={labelStyle}>Telefone</label>
                        <input id="admin-phone" type="tel" className={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="admin-address" className={labelStyle}>Endereço</label>
                        <input id="admin-address" type="text" className={inputStyle} value={address} onChange={e => setAddress(e.target.value)} />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark" disabled={isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { showToast } = useContext(ToastContext);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('A nova senha e a confirmação não correspondem.');
            return;
        }
        if (newPassword.length < 6) {
            setError('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setIsLoading(true);
        const user = auth.currentUser;
        if (user && user.email) {
            try {
                const credential = EmailAuthProvider.credential(user.email, currentPassword);
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPassword);
                showToast('Senha alterada com sucesso!', 'success');
                onClose();
            } catch (error: any) {
                console.error("Password change error:", error);
                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    setError('A senha atual está incorreta.');
                } else {
                    setError('Ocorreu um erro ao alterar a senha. Tente novamente.');
                }
            }
        } else {
            setError('Usuário não encontrado. Por favor, faça login novamente.');
        }
        setIsLoading(false);
    };


    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <form className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()} onSubmit={handleChangePassword}>
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Alterar Senha</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="current-password" className={labelStyle}>Senha Atual</label>
                        <input id="current-password" type="password" className={inputStyle} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="new-password" className={labelStyle}>Nova Senha</label>
                        <input id="new-password" type="password" className={inputStyle} value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="confirm-password" className={labelStyle}>Confirmar Nova Senha</label>
                        <input id="confirm-password" type="password" className={inputStyle} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    </div>
                </div>
                 {error && <p className="text-sm text-red-600 text-center mt-4">{error}</p>}
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark" disabled={isLoading}>
                        {isLoading ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const PaymentsHistoryModal: React.FC<{ isOpen: boolean; onClose: () => void; user: Collaborator }> = ({ isOpen, onClose, user }) => {
    const [payments, setPayments] = useState<Transaction[]>([]);

    useEffect(() => {
        if (!isOpen || !user) return;
        // This logic is complex; a simple fetch for now.
        // A better approach would be a Cloud Function that aggregates this.
        const q = query(collection(db, "transactions"), where("type", "==", "payment"), where("registeredById", "==", user.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
            setPayments(paymentsData);
        });
        return () => unsubscribe();
    }, [isOpen, user]);

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-zinc-800">Histórico de Recebimentos</h3>
                    <button onClick={onClose} className="p-1 -mt-1 -mr-1 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"><XMarkIcon /></button>
                </div>
                <div className="flex-grow overflow-y-auto border-t">
                    <table className="min-w-full">
                        <thead className="bg-zinc-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Mês Referência</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {payments.map(p => (
                                <tr key={p.id} className="hover:bg-zinc-50">
                                    <td className="px-4 py-3 text-sm text-zinc-600">{new Date(p.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-sm text-zinc-600">{p.month}</td>
                                    <td className="px-4 py-3 text-sm text-zinc-800 font-semibold text-right">R$ {p.amount.toFixed(2).replace('.', ',')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="mt-4 flex justify-end">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Fechar</button>
                </div>
            </div>
        </div>
    );
};

interface DashboardCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    onClick?: () => void;
    color: 'primary' | 'secondary';
    disabled?: boolean;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon: Icon, onClick, color, disabled = false }) => {
    const colorClasses = {
        primary: 'from-primary/80 to-primary',
        secondary: 'from-secondary/80 to-secondary',
    };
    const shadowClasses = {
        primary: 'hover:shadow-primary/30',
        secondary: 'hover:shadow-secondary/30',
    }

    return (
        <button
            onClick={onClick}
            className={`bg-gradient-to-br ${colorClasses[color]} text-white p-6 rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl ${shadowClasses[color]} text-left w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg`}
            disabled={!onClick || disabled}
        >
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <p className="text-sm opacity-90">{value}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                    <Icon className="h-6 w-6 text-white" />
                </div>
            </div>
        </button>
    );
};

interface AdminDashboardProps {
  onLogout: () => void;
  currentUser: Collaborator;
}

type View = 'dashboard' | 'students' | 'professionals' | 'classes' | 'calendar' | 'financial' | 'settings';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentUser }) => {
    const [view, setView] = useState<View>('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isBirthdaysOpen, setIsBirthdaysOpen] = useState(false);
    
    // Data states
    const [notifications, setNotifications] = useState<any[]>([]);
    const [birthdays, setBirthdays] = useState<any[]>([]);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const birthdaysRef = useRef<HTMLDivElement>(null);

    const canAccessSettings = currentUser?.adminPermissions?.canAccessSettings ?? false;
    const canAccessFinancial = currentUser?.adminPermissions?.canAccessFinancial ?? false;

    useEffect(() => {
        // Fetch notifications
        const unsubNotifications = onSnapshot(collection(db, "notifications"), (snapshot) => {
            setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        
        // Fetch birthdays (this is complex, simplified for now)
        // In a real app, a daily Cloud Function would populate a 'birthdaysToday' collection.
        // Here we simulate by fetching all students/professionals.
        const fetchBirthdays = async () => {
            const studentsSnap = await getDocs(collection(db, "students"));
            const professionalsSnap = await getDocs(collection(db, "professionals"));
            const today = new Date();
            const todayStr = `${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
            const allPeople = [
                ...studentsSnap.docs.map(d => ({...d.data(), type: 'student'})),
                ...professionalsSnap.docs.map(d => ({...d.data(), type: 'professional'}))
            ];
            const todayBirthdays = allPeople.filter(p => p.birthDate && p.birthDate.substring(5) === todayStr);
            setBirthdays(todayBirthdays.map(p => ({...p, date: 'Hoje'})));
        };
        fetchBirthdays();

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) setIsNotificationsOpen(false);
            if (birthdaysRef.current && !birthdaysRef.current.contains(event.target as Node)) setIsBirthdaysOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        
        return () => {
            unsubNotifications();
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const unreadNotificationsCount = notifications.filter(n => !n.read).length;
    const hasBirthdayToday = birthdays.length > 0;

    const handleMarkAllAsRead = () => {
        // TODO: Implement Firestore update to mark notifications as read
    };
    
    const notificationIcons = {
        new_student: <UserPlusIcon className="h-6 w-6 text-blue-500" />,
        payment_due: <CurrencyDollarIcon className="h-6 w-6 text-amber-500" />,
        class_report: <DocumentTextIcon className="h-6 w-6 text-indigo-500" />,
    };

    const renderContent = () => {
        if (view === 'students') return <StudentList onBack={() => setView('dashboard')} currentUser={currentUser} />;
        if (view === 'professionals') return <ProfessionalList onBack={() => setView('dashboard')} />;
        if (view === 'calendar') return <AgendaView onBack={() => setView('dashboard')} />;
        if (view === 'classes') return <ClassGroupView onBack={() => setView('dashboard')} />;
        if (view === 'settings') return <SettingsView onBack={() => setView('dashboard')} />;
        if (view === 'financial') return <FinancialView onBack={() => setView('dashboard')} />;
        
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-view">
                <div className="md:col-span-2">
                    <h2 className="text-3xl font-bold text-zinc-800">Painel Administrativo</h2>
                </div>
                <DashboardCard title="Alunos" value="Gerenciar matrículas" icon={BookOpenIcon} color="secondary" onClick={() => setView('students')} />
                <DashboardCard title="Profissionais" value="Gerenciar equipe" icon={UserIcon} color="secondary" onClick={() => setView('professionals')} />
                <DashboardCard title="Turmas" value="Visualizar e montar" icon={UsersIcon} color="secondary" onClick={() => setView('classes')} />
                <DashboardCard title="Agenda" value="Visualizar aulas" icon={CalendarDaysIcon} color="secondary" onClick={() => setView('calendar')} />
                <DashboardCard title="Financeiro" value="Contas e recebimentos" icon={CurrencyDollarIcon} color="secondary" onClick={canAccessFinancial ? () => setView('financial') : undefined} disabled={!canAccessFinancial}/>
                <DashboardCard title="Configurações" value="Ajustes do sistema" icon={Cog6ToothIcon} color="secondary" onClick={canAccessSettings ? () => setView('settings') : undefined} disabled={!canAccessSettings}/>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-neutral">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <LogoPlaceholder />
                    <h1 className="text-xl font-semibold text-zinc-700">Portal Oficina do Aluno</h1>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative" ref={notificationsRef}>
                        <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="relative text-zinc-500 hover:text-secondary p-2 rounded-full hover:bg-zinc-100 transition-colors">
                            <AlertIcon className="h-6 w-6" />
                            {unreadNotificationsCount > 0 && (
                                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold ring-2 ring-white">
                                    {unreadNotificationsCount}
                                </span>
                            )}
                        </button>
                         {isNotificationsOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border z-50 animate-fade-in-fast">
                                <div className="p-3 flex justify-between items-center border-b">
                                    <h4 className="font-semibold text-zinc-700">Notificações</h4>
                                    {unreadNotificationsCount > 0 && (
                                        <button onClick={handleMarkAllAsRead} className="text-xs text-secondary hover:underline font-semibold">Marcar todas como lidas</button>
                                    )}
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.map(n => (
                                        <div key={n.id} className={`flex items-start gap-3 p-3 border-b hover:bg-zinc-50 ${!n.read ? 'bg-secondary/5' : ''}`}>
                                            <div className="flex-shrink-0 bg-zinc-100 p-2 rounded-full">
                                                {notificationIcons[n.type as keyof typeof notificationIcons] || <AlertIcon className="h-6 w-6 text-zinc-500" />}
                                            </div>
                                            <div>
                                                <p className="text-sm text-zinc-700">{n.message}</p>
                                                <p className="text-xs text-zinc-500 mt-0.5">{n.timestamp}</p>
                                            </div>
                                            {!n.read && <div className="h-2 w-2 rounded-full bg-secondary self-center ml-auto flex-shrink-0"></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="relative" ref={birthdaysRef}>
                         <button onClick={() => setIsBirthdaysOpen(!isBirthdaysOpen)} className="relative text-zinc-500 hover:text-secondary p-2 rounded-full hover:bg-zinc-100 transition-colors">
                            <BirthdayIcon className="h-6 w-6" />
                             {hasBirthdayToday && (
                                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                                </span>
                            )}
                        </button>
                         {isBirthdaysOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg border z-50 animate-fade-in-fast">
                                <div className="p-3 border-b">
                                    <h4 className="font-semibold text-zinc-700">Aniversariantes do Dia</h4>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {birthdays.map(b => {
                                        const age = calculateAge(b.birthDate);
                                        return (
                                            <div key={b.id} className={`flex items-center gap-3 p-3 border-b hover:bg-zinc-50`}>
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${b.type === 'student' ? 'bg-secondary' : 'bg-primary'}`}>
                                                    {b.name.split(' ').map((n:string) => n[0]).slice(0, 2).join('')}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-zinc-800">
                                                        {b.name}
                                                        {age !== null && <span className="font-normal text-zinc-600"> ({age} anos)</span>}
                                                    </p>
                                                    <p className="text-sm text-zinc-500 capitalize">{b.type}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-800 p-2 rounded-lg hover:bg-zinc-100">
                            <span className="font-semibold">{currentUser.name}</span>
                            <ChevronDownIcon className="h-4 w-4" open={isMenuOpen} />
                        </button>
                        {isMenuOpen && (
                             <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 animate-fade-in-fast border">
                                <button onClick={() => {setIsProfileModalOpen(true); setIsMenuOpen(false);}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"><IdentificationIcon /><span>Alterar Dados</span></button>
                                <button onClick={() => {setIsPasswordModalOpen(true); setIsMenuOpen(false);}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"><LockClosedIcon /><span>Alterar Senha</span></button>
                                <button onClick={() => {setIsPaymentsModalOpen(true); setIsMenuOpen(false);}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"><BanknotesIcon /><span>Recebimentos</span></button>
                                <div className="border-t my-1"></div>
                                <button onClick={onLogout} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><ArrowRightOnRectangleIcon /><span>Sair</span></button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            
            <main className="p-6">
                {renderContent()}
            </main>

            <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={currentUser} />
            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
            <PaymentsHistoryModal isOpen={isPaymentsModalOpen} onClose={() => setIsPaymentsModalOpen(false)} user={currentUser}/>

             <style>{`
                @keyframes fade-in-view { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-view { animation: fade-in-view 0.4s ease-out forwards; }
                @keyframes fade-in-fast { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in-fast { animation: fade-in-fast 0.1s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
