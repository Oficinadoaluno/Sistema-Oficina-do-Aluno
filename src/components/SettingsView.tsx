import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Collaborator, Student, Professional, Transaction } from '../types';
import AddCollaboratorForm from './AddCollaboratorForm';
import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { ArrowLeftIcon, PlusIcon, UserGroupIcon, FunnelIcon, ChartPieIcon, BanknotesIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { ToastContext } from '../App';

// --- Reusable Components ---

const TabButton: React.FC<{
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, icon: Icon, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-2 py-2 px-3 border-b-2 font-semibold text-sm transition-colors ${isActive ? 'border-secondary text-secondary' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}>
        <Icon className="h-5 w-5" />
        <span>{label}</span>
    </button>
);

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

type SettingsTab = 'collaborators' | 'reports' | 'paymentRecords';

interface SettingsViewProps {
    onBack: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [activeTab, setActiveTab] = useState<SettingsTab>('collaborators');
    const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
    
    // Data states
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [collaboratorToEdit, setCollaboratorToEdit] = useState<Collaborator | null>(null);

    // UI state
    const [monthOffset, setMonthOffset] = useState(0);

    // Fetch data from Firestore
    useEffect(() => {
        const unsubCollaborators = db.collection("collaborators").onSnapshot(snap => setCollaborators(snap.docs.map(d => ({id: d.id, ...d.data()})) as Collaborator[]), (err) => showToast("Erro ao buscar colaboradores.", "error"));
        const unsubStudents = db.collection("students").onSnapshot(snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})) as Student[]), (err) => showToast("Erro ao buscar alunos.", "error"));
        const unsubProfessionals = db.collection("professionals").onSnapshot(snap => setProfessionals(snap.docs.map(d => ({id: d.id, ...d.data()})) as Professional[]), (err) => showToast("Erro ao buscar profissionais.", "error"));
        const unsubTransactions = db.collection("transactions").orderBy("date", "desc").onSnapshot(snap => setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()})) as Transaction[]), (err) => showToast("Erro ao buscar registros.", "error"));
        
        return () => { unsubCollaborators(); unsubStudents(); unsubProfessionals(); unsubTransactions(); };
    }, [showToast]);

    const metrics = useMemo(() => ({
        activeStudents: students.filter(s => s.status === 'matricula').length,
        prospectStudents: students.filter(s => s.status === 'prospeccao').length,
        activeProfessionals: professionals.filter(p => p.status === 'ativo').length,
        totalCollaborators: collaborators.length,
    }), [students, professionals, collaborators]);
    
    const paymentRecords = useMemo(() => {
        const targetDate = new Date();
        targetDate.setDate(1);
        targetDate.setUTCHours(0, 0, 0, 0);
        targetDate.setMonth(targetDate.getMonth() + monthOffset);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();
        const monthName = targetDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        const paymentTransactions = transactions.filter(tx => {
             if (!tx.date || tx.type !== 'payment') return false;
             const txDate = new Date(tx.date);
             return txDate.getUTCMonth() === targetMonth && txDate.getUTCFullYear() === targetYear;
        });

        const totalPayments = paymentTransactions.reduce((sum, tx) => sum + tx.amount, 0);

        return { monthName, paymentTransactions, totalPayments };

    }, [transactions, monthOffset]);
    
    const collaboratorMap = useMemo(() => new Map(collaborators.map(c => [c.id, c.name])), [collaborators]);
    const studentMap = useMemo(() => new Map(students.map(s => [s.id, s.name])), [students]);
    const professionalMap = useMemo(() => new Map(professionals.map(p => [p.id, p.name])), [professionals]);

    const getPaymentDescription = (tx: Transaction): string => {
        if (tx.description) return tx.description;
        if (tx.professionalId) {
             const profName = professionalMap.get(tx.professionalId) || 'Profissional';
             return `Pagamento para ${profName} (${tx.month || tx.category || 'N/A'})`;
        }
        if (tx.sourceDest) return `Pagamento para ${tx.sourceDest}`;
        return `Pagamento (${tx.category || 'Geral'})`;
    };


    const handleSaveCollaborator = async (collaboratorData: Omit<Collaborator, 'id'>, password?: string) => {
        try {
            if (view === 'edit' && collaboratorToEdit) {
                const collaboratorRef = db.collection("collaborators").doc(collaboratorToEdit.id);
                await collaboratorRef.update(collaboratorData as any);
                showToast('Colaborador atualizado com sucesso!', 'success');
            } else {
                if (!password) throw new Error("A senha é obrigatória para um novo colaborador.");

                const creationAppName = `user-creation-${Date.now()}`;
                const tempApp = firebase.initializeApp(firebase.app().options, creationAppName);
                const tempAuth = tempApp.auth();

                try {
                    const emailForAuth = collaboratorData.login.includes('@') ? collaboratorData.login : `${collaboratorData.login}@sistema-oficinadoaluno.com`;
                    const userCredential = await tempAuth.createUserWithEmailAndPassword(emailForAuth, password);
                    const uid = userCredential.user!.uid;

                    await db.collection("collaborators").doc(uid).set(collaboratorData);
                    await tempAuth.signOut();
                    showToast('Colaborador criado com sucesso!', 'success');
                } finally {
                    await tempApp.delete();
                }
            }
            setView('list');
            setCollaboratorToEdit(null);
        } catch (error: any) {
            console.error("Error saving collaborator:", error);
            if (error.code === 'auth/email-already-in-use') showToast('Erro: O login (email) já está em uso.', 'error');
            else if (error.code === 'auth/weak-password') showToast('Erro: A senha é muito fraca. Use pelo menos 6 caracteres.', 'error');
            else if (error.code === 'permission-denied') showToast("Você não tem permissão para salvar este colaborador.", "error");
            else showToast("Ocorreu um erro ao salvar o colaborador.", 'error');
        }
    };
    
    const handleEditCollaborator = (collaborator: Collaborator) => {
        setCollaboratorToEdit(collaborator);
        setView('edit');
    };

    if (view === 'add' || view === 'edit') {
        return <AddCollaboratorForm 
            onBack={() => setView('list')} 
            onSave={handleSaveCollaborator}
            collaboratorToEdit={collaboratorToEdit}
        />;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view space-y-6">
            <header className="flex items-center gap-4">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-zinc-800">Configurações</h2>
            </header>

            <div className="border-b">
                <nav className="-mb-px flex space-x-6">
                    <TabButton label="Colaboradores" icon={UserGroupIcon} isActive={activeTab === 'collaborators'} onClick={() => setActiveTab('collaborators')} />
                    <TabButton label="Relatórios" icon={ChartPieIcon} isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                    <TabButton label="Registros de Pagamentos" icon={BanknotesIcon} isActive={activeTab === 'paymentRecords'} onClick={() => setActiveTab('paymentRecords')} />
                </nav>
            </div>

            <main className="flex-grow overflow-y-auto pr-2">
                {activeTab === 'collaborators' && (
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-zinc-700">Gerenciar Equipe</h3>
                            <button onClick={() => { setView('add'); setCollaboratorToEdit(null); }} className="flex items-center gap-2 bg-secondary text-white font-semibold py-2 px-3 rounded-lg hover:bg-secondary-dark">
                                <PlusIcon className="h-5 w-5"/> Novo Colaborador
                            </button>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-zinc-200">
                                <thead className="bg-zinc-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Nome</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Função</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Login</th>
                                        <th className="relative px-4 py-2"><span className="sr-only">Ações</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-zinc-200">
                                    {collaborators.map(c => (
                                        <tr key={c.id}>
                                            <td className="px-4 py-3 text-sm font-medium text-zinc-800">{c.name}</td>
                                            <td className="px-4 py-3 text-sm text-zinc-600">{c.role}</td>
                                            <td className="px-4 py-3 text-sm text-zinc-600">{c.login}</td>
                                            <td className="px-4 py-3 text-right text-sm">
                                                <button onClick={() => handleEditCollaborator(c)} className="font-semibold text-secondary hover:text-secondary-dark">Editar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
                 {activeTab === 'reports' && (
                     <section>
                        <h3 className="text-xl font-semibold text-zinc-700 mb-4">Relatórios e Métricas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard title="Alunos Ativos" value={metrics.activeStudents} icon={UserGroupIcon} />
                            <MetricCard title="Alunos em Prospecção" value={metrics.prospectStudents} icon={FunnelIcon} />
                            <MetricCard title="Profissionais Ativos" value={metrics.activeProfessionals} icon={UserGroupIcon} />
                            <MetricCard title="Colaboradores" value={metrics.totalCollaborators} icon={UserGroupIcon} />
                        </div>
                        <div className="mt-6 p-6 border rounded-lg bg-zinc-50 text-center">
                            <h4 className="font-semibold text-zinc-700">Em breve</h4>
                            <p className="text-zinc-500">Relatórios detalhados de desempenho, financeiros e de captação de alunos estarão disponíveis aqui.</p>
                        </div>
                    </section>
                )}
                 {activeTab === 'paymentRecords' && (
                    <section>
                         <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-zinc-700">Registros de Pagamentos</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-1 rounded-full hover:bg-zinc-100"><ChevronLeftIcon className="h-5 w-5" /></button>
                                <span className="font-semibold text-zinc-800 capitalize w-32 text-center">{paymentRecords.monthName}</span>
                                <button onClick={() => setMonthOffset(monthOffset + 1)} disabled={monthOffset >= 0} className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-50"><ChevronRightIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                         <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
                             <h4 className="text-sm font-medium text-red-800">Total de Pagamentos no Mês</h4>
                             <p className="text-2xl font-bold text-red-700">R$ {paymentRecords.totalPayments.toFixed(2).replace('.', ',')}</p>
                         </div>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-zinc-200">
                                <thead className="bg-zinc-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Descrição</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Registrado Por</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-zinc-200">
                                    {paymentRecords.paymentTransactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td className="px-4 py-3 text-sm text-zinc-600">{new Date(tx.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-zinc-800">{getPaymentDescription(tx)}</td>
                                            <td className="px-4 py-3 text-sm text-zinc-600">{collaboratorMap.get(tx.registeredById) || 'Sistema'}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-right text-red-600">- R$ {tx.amount.toFixed(2).replace('.', ',')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {paymentRecords.paymentTransactions.length === 0 && <p className="p-6 text-center text-zinc-500">Nenhum pagamento registrado neste mês.</p>}
                        </div>
                    </section>
                 )}
            </main>
        </div>
    );
};

export default SettingsView;