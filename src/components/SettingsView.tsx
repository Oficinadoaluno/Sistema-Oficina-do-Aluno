import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Collaborator, Student, Professional, Transaction, ScheduledClass } from '../types';
import { db } from '../firebase';
import { ArrowLeftIcon, UserGroupIcon, FunnelIcon, ChartPieIcon, BanknotesIcon, ChevronLeftIcon, ChevronRightIcon, CurrencyDollarIcon } from './Icons';
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

type SettingsTab = 'reports' | 'paymentRecords' | 'remunerations';

interface SettingsViewProps {
    onBack: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const [activeTab, setActiveTab] = useState<SettingsTab>('reports');
    
    // Data states
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);

    // UI state
    const [monthOffset, setMonthOffset] = useState(0);

    // Fetch data from Firestore
    useEffect(() => {
        const unsubCollaborators = db.collection("collaborators").onSnapshot(snap => setCollaborators(snap.docs.map(d => ({id: d.id, ...d.data()})) as Collaborator[]), (err) => showToast("Erro ao buscar colaboradores.", "error"));
        const unsubStudents = db.collection("students").onSnapshot(snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})) as Student[]), (err) => showToast("Erro ao buscar alunos.", "error"));
        const unsubProfessionals = db.collection("professionals").onSnapshot(snap => setProfessionals(snap.docs.map(d => ({id: d.id, ...d.data()})) as Professional[]), (err) => showToast("Erro ao buscar profissionais.", "error"));
        const unsubTransactions = db.collection("transactions").orderBy("date", "desc").onSnapshot(snap => setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()})) as Transaction[]), (err) => showToast("Erro ao buscar registros.", "error"));
        const unsubClasses = db.collection("scheduledClasses").onSnapshot(snap => setScheduledClasses(snap.docs.map(d => ({id: d.id, ...d.data()})) as ScheduledClass[]), (err) => showToast("Erro ao buscar aulas.", "error"));
        
        return () => { unsubCollaborators(); unsubStudents(); unsubProfessionals(); unsubTransactions(); unsubClasses(); };
    }, [showToast]);

    const metrics = useMemo(() => ({
        activeStudents: students.filter(s => s.status === 'matricula').length,
        prospectStudents: students.filter(s => s.status === 'prospeccao').length,
        activeProfessionals: professionals.filter(p => p.status === 'ativo').length,
        totalCollaborators: collaborators.length,
    }), [students, professionals, collaborators]);
    
    const { monthName, paymentRecords, remunerationsData } = useMemo(() => {
        const targetDate = new Date();
        targetDate.setDate(1);
        targetDate.setUTCHours(0, 0, 0, 0);
        targetDate.setMonth(targetDate.getMonth() + monthOffset);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();
        const monthName = targetDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        // FIX: The generic constraint was too broad, causing TypeScript to lose specific type information.
        // By constraining T to Transaction | ScheduledClass, we ensure the compiler knows about
        // properties like 'type', 'amount', 'status', etc., after the filter is applied.
        const getFilteredData = <T extends Transaction | ScheduledClass>(data: T[]) => 
            data.filter(item => {
                if (!item.date) return false;
                const itemDate = new Date(item.date);
                return itemDate.getUTCMonth() === targetMonth && itemDate.getUTCFullYear() === targetYear;
            });

        // Payment Records
        const paymentTransactions = getFilteredData(transactions).filter(tx => tx.type === 'payment');
        const totalPayments = paymentTransactions.reduce((sum, tx) => sum + tx.amount, 0);

        // Remunerations
        const profRemunerations = professionals.map(prof => {
            const completedClasses = getFilteredData(scheduledClasses).filter(c => c.professionalId === prof.id && c.status === 'completed');
            const totalHours = completedClasses.reduce((sum, c) => sum + (c.duration / 60), 0);
            const earnings = totalHours * (prof.hourlyRateIndividual || 0); // Assuming individual rate
            return { ...prof, classCount: completedClasses.length, earnings };
        });

        const monthlyRevenue = getFilteredData(transactions)
            .filter(tx => tx.type === 'credit' || tx.type === 'monthly')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const collabRemunerations = collaborators.map(collab => {
            let earnings = 0;
            if (collab.remunerationType === 'fixed') {
                earnings = collab.fixedSalary || 0;
            } else if (collab.remunerationType === 'commission') {
                earnings = monthlyRevenue * ((collab.commissionPercentage || 0) / 100);
            }
            return { ...collab, earnings };
        });

        return {
            monthName,
            paymentRecords: { paymentTransactions, totalPayments },
            remunerationsData: { profRemunerations, collabRemunerations }
        };
    }, [transactions, monthOffset, professionals, scheduledClasses, collaborators]);
    
    const collaboratorMap = useMemo(() => new Map(collaborators.map(c => [c.id, c.name])), [collaborators]);
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
                    <TabButton label="Relatórios" icon={ChartPieIcon} isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                    <TabButton label="Registros de Pagamentos" icon={BanknotesIcon} isActive={activeTab === 'paymentRecords'} onClick={() => setActiveTab('paymentRecords')} />
                    <TabButton label="Remunerações" icon={CurrencyDollarIcon} isActive={activeTab === 'remunerations'} onClick={() => setActiveTab('remunerations')} />
                </nav>
            </div>

            <main className="flex-grow overflow-y-auto pr-2">
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
                                <span className="font-semibold text-zinc-800 capitalize w-32 text-center">{monthName}</span>
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
                 {activeTab === 'remunerations' && (
                    <section>
                         <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-zinc-700">Previsão de Remunerações</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-1 rounded-full hover:bg-zinc-100"><ChevronLeftIcon className="h-5 w-5" /></button>
                                <span className="font-semibold text-zinc-800 capitalize w-32 text-center">{monthName}</span>
                                <button onClick={() => setMonthOffset(monthOffset + 1)} disabled={monthOffset >= 0} className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-50"><ChevronRightIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-lg font-semibold text-zinc-600 mb-2">Profissionais</h4>
                                <div className="border rounded-lg overflow-hidden">
                                     <table className="min-w-full divide-y divide-zinc-200">
                                        <thead className="bg-zinc-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Nome</th><th className="px-4 py-2 text-center text-xs font-medium text-zinc-500 uppercase">Aulas Concluídas</th><th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Valor Previsto</th></tr></thead>
                                        <tbody className="bg-white divide-y divide-zinc-200">{remunerationsData.profRemunerations.map(p => (<tr key={p.id}><td className="px-4 py-3 text-sm font-medium text-zinc-800">{p.name}</td><td className="px-4 py-3 text-sm text-zinc-600 text-center">{p.classCount}</td><td className="px-4 py-3 text-sm font-semibold text-right text-zinc-700">R$ {p.earnings.toFixed(2).replace('.', ',')}</td></tr>))}</tbody>
                                    </table>
                                </div>
                            </div>
                             <div>
                                <h4 className="text-lg font-semibold text-zinc-600 mb-2">Colaboradores</h4>
                                <div className="border rounded-lg overflow-hidden">
                                     <table className="min-w-full divide-y divide-zinc-200">
                                        <thead className="bg-zinc-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Nome</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Tipo</th><th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Valor Previsto</th></tr></thead>
                                        <tbody className="bg-white divide-y divide-zinc-200">{remunerationsData.collabRemunerations.map(c => (<tr key={c.id}><td className="px-4 py-3 text-sm font-medium text-zinc-800">{c.name}</td><td className="px-4 py-3 text-sm text-zinc-600 capitalize">{c.remunerationType || 'N/A'}</td><td className="px-4 py-3 text-sm font-semibold text-right text-zinc-700">R$ {c.earnings.toFixed(2).replace('.', ',')}</td></tr>))}</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </section>
                 )}
            </main>
        </div>
    );
};

export default SettingsView;