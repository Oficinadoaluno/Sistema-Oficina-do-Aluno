import React, { useState, useRef, useEffect, useMemo, useContext } from 'react';
import { Professional, ScheduledClass, Student, WeeklyAvailability, DayOfWeek, ClassGroup, ContinuityItem, ClassReport, DiagnosticReport } from '../types';
import { db, auth } from '../firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import WeeklyAvailabilityComponent from './WeeklyAvailability';
import ProfessionalFinancialModal from './ProfessionalFinancialModal';
import DiagnosticReportModal from './DiagnosticReportModal';
import { ToastContext } from '../App';
import { 
    LogoPlaceholder, ChevronDownIcon, CalendarDaysIcon, ArrowRightOnRectangleIcon, IdentificationIcon, 
    LockClosedIcon, BanknotesIcon, ClockIcon, DocumentTextIcon, UsersIcon
} from './Icons';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

// --- Tipos e Interfaces ---
type DisplayClass = 
    | { classType: 'individual'; data: ScheduledClass } 
    | { classType: 'group'; data: ClassGroup; instanceDate: string; time: string };

// --- Modais ---
const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

const UserProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; user: Professional }> = ({ isOpen, onClose, user }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const userRef = db.collection("professionals").doc(user.id);
            const dataToUpdate = { name, email, phone };
            await userRef.update(sanitizeFirestore(dataToUpdate));
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <form className="bg-white rounded-lg p-6 w-full max-w-lg m-4" onClick={e => e.stopPropagation()} onSubmit={handleSave}>
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Alterar Dados</h3>
                <div className="space-y-4">
                    <div><label className={labelStyle}>Nome</label><input type="text" className={inputStyle} value={name} onChange={e => setName(e.target.value)} /></div>
                    <div><label className={labelStyle}>Email</label><input type="email" className={inputStyle} value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div><label className={labelStyle}>Telefone</label><input type="tel" className={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} /></div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 rounded-lg">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white rounded-lg" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </form>
        </div>
    );
};

const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
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
            } catch (err: any) {
                if (err.code === 'auth/wrong-password') setError('Senha atual incorreta.');
                else setError('Ocorreu um erro ao alterar a senha.');
            }
        }
        setIsLoading(false);
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <form className="bg-white rounded-lg p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()} onSubmit={handleChangePassword}>
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Alterar Senha</h3>
                <div className="space-y-4">
                    <div><label className={labelStyle}>Senha Atual</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputStyle} required /></div>
                    <div><label className={labelStyle}>Nova Senha</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputStyle} required /></div>
                </div>
                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 rounded-lg">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white rounded-lg" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </form>
        </div>
    );
};

// --- Componente Principal ---
interface TeacherDashboardProps { onLogout: () => void; currentUser: Professional; }

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout, currentUser }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [view, setView] = useState<'dashboard' | 'availability'>('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
    const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
    const [reportContext, setReportContext] = useState<any>(null);

    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [continuityItems, setContinuityItems] = useState<ContinuityItem[]>([]);
    
    const menuRef = useRef<HTMLDivElement>(null);

    const createSpecificErrorHandler = (context: string) => (error: any) => {
        console.error(`Firestore (${context}) Error:`, error);
        if (error.code === 'permission-denied') {
            showToast(`Você não tem permissão para ver ${context.toLowerCase()}.`, "error");
        } else if (error.code === 'failed-precondition') {
            showToast(`Erro de configuração: índice ausente para ${context.toLowerCase()}.`, "error");
        } else if (error.code === 'unavailable') {
            showToast("Erro de conexão. Verifique sua internet.", "error");
        } else {
            showToast(`Ocorreu um erro ao buscar dados de ${context.toLowerCase()}.`, "error");
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const qClasses = db.collection("scheduledClasses").where("professionalId", "==", currentUser.id);
                const classesSnap = await qClasses.get();
                const classesData = classesSnap.docs.map(d => ({id: d.id, ...d.data()})) as ScheduledClass[];
                setScheduledClasses(classesData);

                const qGroups = db.collection("classGroups").where("professionalId", "==", currentUser.id);
                const groupsSnap = await qGroups.get();
                const groupsData = groupsSnap.docs.map(d => ({id: d.id, ...d.data()})) as ClassGroup[];
                setClassGroups(groupsData);
                
                const studentIds = new Set([
                    ...classesData.map(c => c.studentId),
                    ...groupsData.flatMap(g => g.studentIds)
                ]);

                if (studentIds.size > 0) {
                    const studentIdArray = Array.from(studentIds);
                    const qStudents = db.collection("students").where(firebase.firestore.FieldPath.documentId(), "in", studentIdArray);
                    const studentsSnap = await qStudents.get();
                    setStudents(studentsSnap.docs.map(d => ({id: d.id, ...d.data()})) as Student[]);

                    const qContinuity = db.collection("continuityItems").where("studentId", "in", studentIdArray);
                    const continuitySnap = await qContinuity.get();
                    setContinuityItems(continuitySnap.docs.map(d => ({id: d.id, ...d.data()})) as ContinuityItem[]);
                } else {
                    setStudents([]);
                    setContinuityItems([]);
                }
            } catch (error) {
                createSpecificErrorHandler('dados do painel')(error);
            }
        };
        fetchData();
    }, [currentUser.id]);


    const handleSaveAvailability = async (newAvailability: WeeklyAvailability) => {
        try {
            const profRef = db.collection("professionals").doc(currentUser.id);
            await profRef.update(sanitizeFirestore({ availability: newAvailability }));
            showToast('Disponibilidade salva com sucesso!', 'success');
        } catch (error) {
            showToast("Ocorreu um erro ao salvar.", "error");
        }
    };
    
    const handleSaveDiagnosticReport = async (context: any, reportData: DiagnosticReport) => {
        try {
            const classRef = db.collection('scheduledClasses').doc(context.id);
            const dataToUpdate = { diagnosticReport: reportData, reportRegistered: true, status: 'completed' as const };
            await classRef.update(sanitizeFirestore(dataToUpdate));
            
            if(reportData.actionPlan.initialContinuityPlan) {
                for (const item of reportData.actionPlan.initialContinuityPlan) {
                    if (item.description.trim()) {
                        const newItem = {
                            description: item.description, status: 'nao_iniciado' as const,
                            studentId: context.studentId, createdBy: currentUser.id,
                            createdAt: new Date().toISOString().split('T')[0]
                        };
                        await db.collection('continuityItems').add(sanitizeFirestore(newItem));
                    }
                }
            }
            showToast('Relatório diagnóstico salvo!', 'success');
            setIsDiagnosticModalOpen(false);
        } catch (error) {
            showToast('Erro ao salvar o relatório.', 'error');
        }
    };

    const { upcomingClasses, pastClasses } = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const all = scheduledClasses
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return {
            upcomingClasses: all.filter(c => c.date >= todayStr),
            pastClasses: all.filter(c => c.date < todayStr && !c.reportRegistered).reverse(),
        };
    }, [scheduledClasses]);

    const renderDashboard = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-view">
            <section className="lg:col-span-2 space-y-6">
                <div>
                    <h3 className="text-xl font-semibold text-zinc-700 mb-2 flex items-center gap-2"><CalendarDaysIcon/> Próximas Aulas</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {upcomingClasses.map(c => {
                            const student = students.find(s => s.id === c.studentId);
                            return (
                                <div key={c.id} className="bg-zinc-50 p-3 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-zinc-800">{student?.name || 'Carregando...'}</p>
                                        <p className="text-sm text-zinc-600">{c.discipline}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">{new Date(c.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                        <p className="text-sm text-zinc-500 flex items-center gap-1 justify-end"><ClockIcon/> {c.time}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-zinc-700 mb-2 flex items-center gap-2"><DocumentTextIcon/> Relatórios Pendentes</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {pastClasses.map(c => {
                            const student = students.find(s => s.id === c.studentId);
                            const context = { id: c.id, studentId: c.studentId, studentName: student?.name };
                            return (
                                <div key={c.id} className="bg-amber-50 p-3 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-amber-800">{student?.name || 'Carregando...'}</p>
                                        <p className="text-sm text-amber-700">{c.discipline} - {new Date(c.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                    </div>
                                    <button onClick={() => { setReportContext(context); setIsDiagnosticModalOpen(true); }} className="bg-secondary text-white font-semibold py-1 px-3 rounded-md text-sm">Lançar Relatório</button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
            <aside className="space-y-6">
                <div className="bg-zinc-50 border p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-zinc-700 mb-2">Minhas Turmas</h3>
                    <ul className="space-y-2">{classGroups.map(g => <li key={g.id} className="font-semibold">{g.name}</li>)}</ul>
                </div>
                <div className="bg-zinc-50 border p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-zinc-700 mb-2">Plano de Continuidade Ativo</h3>
                    <ul className="space-y-2">{continuityItems.filter(i => i.status !== 'concluido').map(item => <li key={item.id} className="text-sm">{students.find(s => s.id === item.studentId)?.name}: {item.description}</li>)}</ul>
                </div>
            </aside>
        </div>
    );

    return (
        <div className="min-h-screen bg-neutral font-sans">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-4"><LogoPlaceholder /><h1 className="text-xl font-semibold">Portal do Professor</h1></div>
                <div ref={menuRef} className="relative">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-100">
                        <span className="font-semibold">{currentUser.name}</span>
                        <ChevronDownIcon open={isMenuOpen} />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border">
                            <button onClick={() => setIsProfileModalOpen(true)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-100"><IdentificationIcon />Alterar Dados</button>
                            <button onClick={() => setIsPasswordModalOpen(true)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-100"><LockClosedIcon />Alterar Senha</button>
                            <button onClick={() => setIsFinancialModalOpen(true)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-100"><BanknotesIcon />Financeiro</button>
                            <div className="border-t my-1"></div>
                            <button onClick={onLogout} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><ArrowRightOnRectangleIcon />Sair</button>
                        </div>
                    )}
                </div>
            </header>
            
            <main className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-zinc-800">Meu Painel</h2>
                    <div>
                        <button onClick={() => setView('dashboard')} className={`py-2 px-4 rounded-lg font-semibold ${view === 'dashboard' ? 'bg-secondary text-white' : 'bg-white'}`}>Painel</button>
                        <button onClick={() => setView('availability')} className={`py-2 px-4 rounded-lg font-semibold ${view === 'availability' ? 'bg-secondary text-white' : 'bg-white'}`}>Disponibilidade</button>
                    </div>
                </div>
                {view === 'dashboard' ? renderDashboard() : <WeeklyAvailabilityComponent initialAvailability={currentUser.availability || {}} onSave={handleSaveAvailability} />}
            </main>

            <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={currentUser} />
            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
            <ProfessionalFinancialModal isOpen={isFinancialModalOpen} onClose={() => setIsFinancialModalOpen(false)} professional={currentUser} />
            <DiagnosticReportModal isOpen={isDiagnosticModalOpen} onClose={() => setIsDiagnosticModalOpen(false)} onSave={handleSaveDiagnosticReport} context={reportContext} />
        </div>
    );
};
export default TeacherDashboard;