import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import StudentList from './StudentList';
import ProfessionalList from './ProfessionalList';
import AgendaView from './AgendaView';
import ClassGroupView from './ClassGroupView';
import SettingsView from './SettingsView';
import PackagesView from './PackagesView';
import PricingView from './PricingView';
import { Collaborator, Student, Professional, ScheduledClass, Transaction } from '../types'; 
import { db, auth } from '../firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { ToastContext } from '../App';
import { 
    LogoPlaceholder, UserIcon, ChevronDownIcon, BookOpenIcon, UsersIcon, 
    Cog6ToothIcon, ArrowRightOnRectangleIcon, ArchiveBoxIcon,
    IdentificationIcon, LockClosedIcon, CalendarDaysIcon, ChartPieIcon,
    BirthdayIcon, AlertIcon, ClockIcon, BanknotesIcon, CurrencyDollarIcon,
    Bars3Icon, ArrowPathIcon
} from './Icons';
import { sanitizeFirestore, getShortName } from '../utils/sanitizeFirestore';

// --- Modais de Perfil ---
const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

const UserProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; user: Collaborator }> = ({ isOpen, onClose, user }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [address, setAddress] = useState(user.address || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const userRef = db.collection("collaborators").doc(user.id);
            const dataToUpdate = { name, email, phone, address };
            await userRef.update(sanitizeFirestore(dataToUpdate));
            showToast('Dados atualizados com sucesso!', 'success');
            onClose();
        } catch (error: any) {
            console.error("Error updating user profile:", error);
            showToast("Ocorreu um erro ao salvar os dados.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <form className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4" onClick={e => e.stopPropagation()} onSubmit={handleSave}>
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Alterar Dados</h3>
                <div className="space-y-4">
                    <div><label htmlFor="admin-name" className={labelStyle}>Nome</label><input id="admin-name" type="text" className={inputStyle} value={name} onChange={e => setName(e.target.value)} /></div>
                    <div><label htmlFor="admin-email" className={labelStyle}>Email</label><input id="admin-email" type="email" className={inputStyle} value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div><label htmlFor="admin-phone" className={labelStyle}>Telefone</label><input id="admin-phone" type="tel" className={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} /></div>
                    <div><label htmlFor="admin-address" className={labelStyle}>Endereço</label><input id="admin-address" type="text" className={inputStyle} value={address} onChange={e => setAddress(e.target.value)} /></div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </form>
        </div>
    );
};

const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) { setError('A nova senha e a confirmação não correspondem.'); return; }
        if (newPassword.length < 6) { setError('A nova senha deve ter pelo menos 6 caracteres.'); return; }

        setIsLoading(true);
        const user = auth.currentUser;
        if (user && user.email) {
            try {
                const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
                await user.reauthenticateWithCredential(credential);
                await user.updatePassword(newPassword);
                showToast('Senha alterada com sucesso!', 'success');
                onClose();
            } catch (error: any) {
                console.error("Password change error:", error);
                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') { setError('A senha atual está incorreta.'); } 
                else { setError('Ocorreu um erro ao alterar a senha. Tente novamente.'); }
            }
        } else { setError('Usuário não encontrado. Por favor, faça login novamente.'); }
        setIsLoading(false);
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <form className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()} onSubmit={handleChangePassword}>
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Alterar Senha</h3>
                <div className="space-y-4">
                    <div><label htmlFor="current-password" className={labelStyle}>Senha Atual</label><input id="current-password" type="password" className={inputStyle} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></div>
                    <div><label htmlFor="new-password" className={labelStyle}>Nova Senha</label><input id="new-password" type="password" className={inputStyle} value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></div>
                    <div><label htmlFor="confirm-password" className={labelStyle}>Confirmar Nova Senha</label><input id="confirm-password" type="password" className={inputStyle} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>
                </div>
                {error && <p className="text-sm text-red-600 text-center mt-4">{error}</p>}
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </form>
        </div>
    );
};

// --- Card de métrica reutilizável ---
const MetricCard: React.FC<{ title: string; value: string | number; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border flex items-start gap-4">
        <div className="bg-secondary/10 p-3 rounded-full">
            <Icon className="h-6 w-6 text-secondary" />
        </div>
        <div>
            <h4 className="text-sm font-medium text-zinc-500">{title}</h4>
            <p className="text-2xl font-bold text-zinc-800">{value}</p>
        </div>
    </div>
);

const robustCalculateAge = (birthDateString?: string): number | null => {
    if (!birthDateString || !/^\d{4}-\d{2}-\d{2}$/.test(birthDateString)) return null;

    const [year, month, day] = birthDateString.split('-').map(Number);
    
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < day)) {
        age--;
    }
    return age;
};

// --- Componente de Conteúdo do Dashboard ---
const DashboardContent: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [studentsSnap, profsSnap, classesSnap] = await Promise.all([
                    db.collection("students").get(),
                    db.collection("professionals").get(),
                    db.collection("scheduledClasses").get(),
                ]);
                setStudents(studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Student[]);
                setProfessionals(profsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Professional[]);
                setScheduledClasses(classesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ScheduledClass[]);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const activeStudentsCount = useMemo(() => {
        return students.filter(s => s.status === 'matricula').length;
    }, [students]);
    
    const monthBirthdays = useMemo(() => {
        if (!students || students.length === 0) return [];
        const today = new Date();
        const currentMonth = today.getMonth();

        return students
            .filter(student => {
                if (!student.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(student.birthDate)) return false;
                const [_year, month, _day] = student.birthDate.split('-').map(Number);
                return (month - 1) === currentMonth;
            })
            .map(student => {
                const [_year, _month, day] = student.birthDate.split('-').map(Number);
                const age = robustCalculateAge(student.birthDate);
                return {
                    id: student.id,
                    name: student.name,
                    day: day,
                    age: age,
                };
            })
            .sort((a, b) => a.day - b.day);
    }, [students]);

    const todaysClasses = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return scheduledClasses
            .filter(c => c.date === todayStr && c.status === 'scheduled')
            .sort((a, b) => a.time.localeCompare(b.time));
    }, [scheduledClasses]);
    
    const classesToBill = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return scheduledClasses
            .filter(c => {
                const classDate = new Date(c.date);
                return classDate < today &&
                       c.status !== 'canceled' &&
                       (!c.paymentStatus || c.paymentStatus === 'pending');
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [scheduledClasses]);


    if (loading) {
        return <div className="text-center p-10">Carregando informações...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in-view">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard title="Aulas de Hoje" value={todaysClasses.length} icon={CalendarDaysIcon} />
                <MetricCard title="Aulas a Faturar" value={classesToBill.length} icon={BanknotesIcon} />
                <MetricCard title="Alunos Ativos" value={activeStudentsCount} icon={UsersIcon} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div>
                    <h3 className="text-lg font-semibold text-zinc-700 mb-2 flex items-center gap-2"><CalendarDaysIcon className="h-5 w-5 text-zinc-500"/> Aulas de Hoje</h3>
                    <div className="bg-white border rounded-lg p-4 space-y-3 max-h-80 overflow-y-auto">
                        {todaysClasses.length > 0 ? todaysClasses.map(c => {
                            const student = students.find(s => s.id === c.studentId);
                            const professional = professionals.find(p => p.id === c.professionalId);
                            return (
                                <div key={c.id} className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2 font-semibold text-secondary w-20"><ClockIcon className="h-4 w-4" /> {c.time}</div>
                                    <div className="flex-grow">
                                        <p className="font-bold text-zinc-800" title={student?.name || 'Aluno não encontrado'}>{getShortName(student?.name) || 'Aluno não encontrado'}</p>
                                        <p className="text-zinc-500">{c.discipline} com <span title={professional?.name}>{getShortName(professional?.name) || 'Prof. não encontrado'}</span></p>
                                    </div>
                                </div>
                            );
                        }) : <p className="text-zinc-500 text-center py-4">Nenhuma aula agendada para hoje.</p>}
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold text-zinc-700 mb-2 flex items-center gap-2"><BanknotesIcon className="h-5 w-5 text-amber-500" /> Aulas a Faturar</h3>
                    <div className="bg-white border rounded-lg p-4 space-y-3 max-h-80 overflow-y-auto">
                        {classesToBill.length > 0 ? classesToBill.map(c => {
                            const student = students.find(s => s.id === c.studentId);
                            return (
                                <div key={c.id} className="flex items-start gap-3 text-sm p-2 bg-amber-50/50 rounded-md">
                                    <BanknotesIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-amber-800" title={student?.name || 'Aluno não encontrado'}>{getShortName(student?.name) || 'Aluno não encontrado'}</p>
                                        <p className="text-amber-700">{c.discipline} em {new Date(c.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                    </div>
                                </div>
                            );
                        }) : <p className="text-zinc-500 text-center py-4">Nenhuma aula pendente de faturamento.</p>}
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold text-zinc-700 mb-2 flex items-center gap-2"><BirthdayIcon className="h-5 w-5 text-pink-500"/> Aniversariantes do Mês</h3>
                    <div className="bg-white border rounded-lg p-4 space-y-3 max-h-80 overflow-y-auto">
                        {monthBirthdays.length > 0 ? monthBirthdays.map(b => (
                            <div key={b.id} className="flex items-start gap-3 text-sm p-2 bg-pink-50/50 rounded-md">
                                <BirthdayIcon className="h-5 w-5 text-pink-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-pink-800" title={b.name}>{getShortName(b.name)}</p>
                                    <p className="text-pink-700">Dia {b.day} {b.age !== null ? `— completando ${b.age + 1} anos` : ''}</p>
                                </div>
                            </div>
                        )) : <p className="text-zinc-500 text-center py-4">Nenhum aniversário este mês.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal ---
interface AdminDashboardProps { onLogout: () => void; currentUser: Collaborator; }
type View = 'dashboard' | 'students' | 'professionals' | 'classes' | 'calendar' | 'settings' | 'packages' | 'pricing';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentUser }) => {
    const [view, setView] = useState<View>('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    const userRole = currentUser.role?.toLowerCase() || '';
    const canAccessSettings = userRole.includes('diretor');
    const canAccessPackages = userRole.includes('diretor') || userRole.includes('secretaria');
    const canAccessAgenda = userRole.includes('diretor') || userRole.includes('secretaria');
    const canAccessPricing = userRole.includes('diretor');
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navItems = [
        { id: 'dashboard', label: 'Painel', icon: ChartPieIcon, canAccess: true },
        { id: 'students', label: 'Alunos', icon: BookOpenIcon, canAccess: true },
        { id: 'professionals', label: 'Equipe', icon: UserIcon, canAccess: true },
        { id: 'classes', label: 'Turmas e Planos', icon: UsersIcon, canAccess: true },
        { id: 'pricing', label: 'Valores', icon: CurrencyDollarIcon, canAccess: canAccessPricing },
        { id: 'packages', label: 'Pacotes', icon: ArchiveBoxIcon, canAccess: canAccessPackages },
        { id: 'calendar', label: 'Agenda', icon: CalendarDaysIcon, canAccess: canAccessAgenda },
        { id: 'settings', label: 'Relatórios e Finanças', icon: Cog6ToothIcon, canAccess: canAccessSettings },
    ];

    const pageTitles: Record<View, string> = {
        dashboard: 'Painel de Controle',
        students: 'Gestão de Alunos',
        professionals: 'Gestão de Equipe',
        classes: 'Gestão de Turmas e Planos',
        packages: 'Gestão de Pacotes de Aulas',
        pricing: 'Valores e Serviços',
        calendar: 'Agenda',
        settings: 'Relatórios e Finanças'
    };

    const renderContent = () => {
        switch (view) {
            case 'students': return <StudentList onBack={() => setView('dashboard')} currentUser={currentUser} />;
            case 'professionals': return <ProfessionalList onBack={() => setView('dashboard')} currentUser={currentUser} />;
            case 'calendar': return <AgendaView onBack={() => setView('dashboard')} />;
            case 'classes': return <ClassGroupView onBack={() => setView('dashboard')} />;
            case 'packages': return <PackagesView onBack={() => setView('dashboard')} currentUser={currentUser} />;
            case 'pricing': return <PricingView onBack={() => setView('dashboard')} />;
            case 'settings': return <SettingsView onBack={() => setView('dashboard')} />;
            case 'dashboard':
            default: return <DashboardContent key={refreshKey} />;
        }
    };

    return (
        <div className="flex h-screen bg-neutral font-sans">
            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                onClick={() => setIsSidebarOpen(false)}
            ></div>

            {/* Sidebar */}
            <aside className={`absolute md:static z-40 w-64 h-full bg-white p-4 shadow-lg flex-shrink-0 flex flex-col transition-transform transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <div className="flex items-center gap-3 mb-8 px-2">
                    <LogoPlaceholder />
                    <h1 className="text-xl font-semibold text-zinc-700">Oficina do Aluno</h1>
                </div>
                <nav className="flex-grow">
                    <ul className="space-y-2">
                        {navItems.map(item => item.canAccess && (
                            <li key={item.id}>
                                <button onClick={() => { setView(item.id as View); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${view === item.id ? 'bg-secondary/10 text-secondary' : 'text-zinc-600 hover:bg-zinc-100'}`}>
                                    <item.icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white shadow-sm p-4 flex justify-between items-center flex-shrink-0 z-10">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-zinc-600 hover:bg-zinc-100 rounded-md">
                            <Bars3Icon className="h-6 w-6" />
                        </button>
                        <h2 className="text-xl md:text-2xl font-bold text-zinc-800">{pageTitles[view]}</h2>
                         <button 
                            onClick={() => setRefreshKey(k => k + 1)} 
                            className="p-1 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors" 
                            title="Atualizar dados"
                        >
                            <ArrowPathIcon className="h-5 w-5" />
                        </button>
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
                                <div className="border-t my-1"></div>
                                <button onClick={onLogout} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><ArrowRightOnRectangleIcon /><span>Sair</span></button>
                            </div>
                        )}
                    </div>
                </header>
                
                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {renderContent()}
                </main>
            </div>

            <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={currentUser} />
            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />

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
