
import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Collaborator, Student, Professional, Transaction, ScheduledClass } from '../types';
import { db } from '../firebase';
// FIX: Add missing CalendarDaysIcon import
import { ArrowLeftIcon, UserGroupIcon, FunnelIcon, ChartPieIcon, BanknotesIcon, ChevronLeftIcon, ChevronRightIcon, CurrencyDollarIcon, ClockIcon, AcademicCapIcon, CalendarDaysIcon } from './Icons';
import { ToastContext } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';


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

const MetricCard: React.FC<{ title: string; value: string | number; subValue?: string; icon: React.ElementType }> = ({ title, value, subValue, icon: Icon }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border flex items-start gap-4">
        <div className="bg-secondary/10 p-3 rounded-full">
            <Icon className="h-6 w-6 text-secondary" />
        </div>
        <div>
            <h4 className="text-sm font-medium text-zinc-500">{title}</h4>
            <p className="text-2xl font-bold text-zinc-800">{value}</p>
            {subValue && <p className="text-xs text-zinc-500 -mt-1">{subValue}</p>}
        </div>
    </div>
);

const ChartContainer: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border h-[350px] flex flex-col">
        <h4 className="font-semibold text-zinc-700 mb-4">{title}</h4>
        <div className="flex-grow text-xs">
            {children}
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
    const [lastYearClasses, setLastYearClasses] = useState<number | ''>('');

    // Fetch data from Firestore
    useEffect(() => {
        const unsubCollaborators = db.collection("collaborators").onSnapshot(snap => setCollaborators(snap.docs.map(d => ({id: d.id, ...d.data()})) as Collaborator[]), (err) => showToast("Erro ao buscar colaboradores.", "error"));
        const unsubStudents = db.collection("students").onSnapshot(snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})) as Student[]), (err) => showToast("Erro ao buscar alunos.", "error"));
        const unsubProfessionals = db.collection("professionals").onSnapshot(snap => setProfessionals(snap.docs.map(d => ({id: d.id, ...d.data()})) as Professional[]), (err) => showToast("Erro ao buscar profissionais.", "error"));
        const unsubTransactions = db.collection("transactions").orderBy("date", "desc").onSnapshot(snap => setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()})) as Transaction[]), (err) => showToast("Erro ao buscar registros.", "error"));
        const unsubClasses = db.collection("scheduledClasses").onSnapshot(snap => setScheduledClasses(snap.docs.map(d => ({id: d.id, ...d.data()})) as ScheduledClass[]), (err) => showToast("Erro ao buscar aulas.", "error"));
        
        return () => { unsubCollaborators(); unsubStudents(); unsubProfessionals(); unsubTransactions(); unsubClasses(); };
    }, [showToast]);
    
    const studentMap = useMemo(() => new Map(students.map(s => [s.id, s.name])), [students]);
    const professionalMap = useMemo(() => new Map(professionals.map(p => [p.id, p.name])), [professionals]);
    const collaboratorMap = useMemo(() => new Map(collaborators.map(c => [c.id, c.name])), [collaborators]);

    const { monthName, reportMetrics, paymentRecords, remunerationsData } = useMemo(() => {
        const targetDate = new Date();
        targetDate.setDate(1);
        targetDate.setUTCHours(0, 0, 0, 0);
        targetDate.setMonth(targetDate.getMonth() + monthOffset);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();
        const monthName = targetDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        const getFilteredData = <T extends Transaction | ScheduledClass>(data: T[]) => 
            data.filter(item => {
                if (!item.date) return false;
                const itemDate = new Date(item.date);
                return itemDate.getUTCMonth() === targetMonth && itemDate.getUTCFullYear() === targetYear;
            });
        
        // --- Reports Tab ---
        const completedClasses = scheduledClasses.filter(c => c.status === 'completed');
        const classesInMonth = getFilteredData(completedClasses);
        
        const totalDuration = completedClasses.reduce((sum, cls: ScheduledClass) => sum + (cls.duration || 0), 0);
        const avgClassDuration = completedClasses.length > 0 ? (totalDuration / completedClasses.length).toFixed(0) : 0;
        
        const totalHoursInMonth = classesInMonth.reduce((sum, cls: ScheduledClass) => sum + (cls.duration || 0), 0) / 60;
        const avgWeeklyHours = (totalHoursInMonth / 4.33).toFixed(1);

        const uniqueStudentsInMonth = new Set(classesInMonth.map(c => c.studentId));
        const avgMonthlyStudents = uniqueStudentsInMonth.size;
        const avgWeeklyStudents = (avgMonthlyStudents / 4.33).toFixed(1);

        const disciplineCounts = classesInMonth.reduce((acc, cls: ScheduledClass) => {
            acc[cls.discipline] = (acc[cls.discipline] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const disciplineData = Object.entries(disciplineCounts).map(([name, Aulas]) => ({ name, Aulas })).sort((a, b) => b.Aulas - a.Aulas);

        const studentHours = completedClasses.reduce((acc, cls: ScheduledClass) => {
            acc[cls.studentId] = (acc[cls.studentId] || 0) + (cls.duration || 0) / 60;
            return acc;
        }, {} as Record<string, number>);
        
        const topStudentsData = Object.entries(studentHours).map(([studentId, hours]: [string, number]) => ({ studentName: studentMap.get(studentId) || 'Aluno desconhecido', hours: hours.toFixed(1) })).sort((a, b) => Number(b.hours) - Number(a.hours)).slice(0, 10);
        
        const profClassCounts = classesInMonth.reduce((acc, cls: ScheduledClass) => {
            acc[cls.professionalId] = (acc[cls.professionalId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const classesByProfData = Object.entries(profClassCounts).map(([profId, Aulas]) => ({ name: professionalMap.get(profId) || 'Professor desconhecido', Aulas })).sort((a, b) => b.Aulas - a.Aulas);

        const locationCounts = classesInMonth.reduce((acc, cls: ScheduledClass) => {
            const loc = cls.location || 'presencial';
            acc[loc] = (acc[loc] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const locationData = [{ name: 'Online', value: locationCounts.online || 0 }, { name: 'Presencial', value: locationCounts.presencial || 0 }];
        
        // --- Payment Records ---
        const paymentTransactions = getFilteredData(transactions).filter(tx => tx.type === 'payment');
        const totalPayments = paymentTransactions.reduce((sum, tx) => 'amount' in tx ? sum + tx.amount : sum, 0);

        // --- Remunerations ---
        const profRemunerations = professionals.map(prof => {
            const profClassesInMonth = classesInMonth.filter(c => c.professionalId === prof.id);
            const totalHours = profClassesInMonth.reduce((sum, c: ScheduledClass) => sum + (c.duration / 60), 0);
            const earnings = (totalHours * (prof.hourlyRateIndividual || 0)) + (prof.fixedSalary || 0); 
            return { ...prof, classCount: profClassesInMonth.length, earnings };
        });

        const monthlyRevenue = getFilteredData(transactions).filter(tx => tx.type === 'credit' || tx.type === 'monthly').reduce((sum, tx) => 'amount' in tx ? sum + tx.amount : sum, 0);
        const collabRemunerations = collaborators.map(collab => {
            let earnings = 0;
            if (collab.remunerationType === 'fixed') earnings = collab.fixedSalary || 0;
            else if (collab.remunerationType === 'commission') earnings = monthlyRevenue * ((collab.commissionPercentage || 0) / 100);
            return { ...collab, earnings };
        });

        return {
            monthName,
            reportMetrics: {
                avgClassDuration, avgWeeklyHours, avgMonthlyStudents, avgWeeklyStudents,
                classesInMonthCount: classesInMonth.length,
                disciplineData, topStudentsData, classesByProfData, locationData
            },
            paymentRecords: { paymentTransactions, totalPayments },
            remunerationsData: { profRemunerations, collabRemunerations }
        };
    }, [transactions, monthOffset, professionals, scheduledClasses, collaborators, students, studentMap, professionalMap]);
    
    const getPaymentDescription = (tx: Transaction): string => {
        if (tx.description) return tx.description;
        if (tx.professionalId) return `Pagamento para ${professionalMap.get(tx.professionalId) || 'Profissional'} (${tx.month || tx.category || 'N/A'})`;
        if (tx.sourceDest) return `Pagamento para ${tx.sourceDest}`;
        return `Pagamento (${tx.category || 'Geral'})`;
    };
    
    const PIE_COLORS = ['#0e7490', '#F39B53', '#34d399', '#f59e0b'];

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view space-y-6">
            <header className="flex items-center gap-4">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-zinc-800">Relatórios e Finanças</h2>
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
                     <section className="space-y-6">
                        <div className="flex items-center justify-between">
                             <h3 className="text-xl font-semibold text-zinc-700">Relatórios Gerais e do Mês</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-1 rounded-full hover:bg-zinc-100"><ChevronLeftIcon className="h-5 w-5" /></button>
                                <span className="font-semibold text-zinc-800 capitalize w-32 text-center">{monthName}</span>
                                <button onClick={() => setMonthOffset(monthOffset + 1)} disabled={monthOffset >= 0} className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-50"><ChevronRightIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard title="Tempo Médio de Aula" value={`${reportMetrics.avgClassDuration} min`} icon={ClockIcon} subValue="(geral)"/>
                            <MetricCard title="Média de Horas/Semana" value={`${reportMetrics.avgWeeklyHours} h`} icon={CalendarDaysIcon} subValue="(no mês)" />
                            <MetricCard title="Alunos Atendidos/Mês" value={reportMetrics.avgMonthlyStudents} icon={UserGroupIcon} subValue="(no mês)" />
                            <MetricCard title="Média de Alunos/Semana" value={reportMetrics.avgWeeklyStudents} icon={UserGroupIcon} subValue="(no mês)" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartContainer title={`Aulas no Mês vs Ano Anterior`}>
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="text-xs font-medium">Aulas no mesmo mês do ano anterior:</label>
                                        <input type="number" value={lastYearClasses} onChange={e => setLastYearClasses(e.target.value === '' ? '' : Number(e.target.value))} className="w-20 px-2 py-1 border rounded-md text-sm"/>
                                    </div>
                                    <div className="flex-grow">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[{ name: 'Aulas Particulares', 'Ano Anterior': Number(lastYearClasses) || 0, 'Ano Atual': reportMetrics.classesInMonthCount }]}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="Ano Anterior" fill="#a1a1aa" />
                                            <Bar dataKey="Ano Atual" fill="#0e7490" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                    </div>
                                </div>
                            </ChartContainer>
                            <ChartContainer title="Distribuição de Disciplinas no Mês">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reportMetrics.disciplineData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis type="category" dataKey="name" width={100} />
                                        <Tooltip />
                                        <Bar dataKey="Aulas" fill="#0e7490" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                             <div className="bg-white p-4 rounded-lg shadow-sm border">
                                <h4 className="font-semibold text-zinc-700 mb-4 flex items-center gap-2"><AcademicCapIcon className="h-5 w-5 text-secondary" />Top 10 Alunos (Horas de Aula Totais)</h4>
                                <ul className="space-y-2">
                                    {reportMetrics.topStudentsData.map((s, i) => (
                                        <li key={s.studentName || i} className="flex justify-between items-center text-sm p-2 rounded-md even:bg-zinc-50">
                                            <span className="font-medium text-zinc-800">{i + 1}. {s.studentName}</span>
                                            <span className="font-bold text-secondary">{s.hours} h</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                             <ChartContainer title="Aulas por Professor no Mês">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reportMetrics.classesByProfData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="Aulas" fill="#F39B53" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                            <ChartContainer title="Aulas Online vs Presencial no Mês">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={reportMetrics.locationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                            {reportMetrics.locationData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
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