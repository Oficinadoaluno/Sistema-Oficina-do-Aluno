import React, { useState, useMemo, useEffect, useContext, useRef } from 'react';
import { Collaborator, Student, Professional, Transaction, ScheduledClass, PaymentMethod } from '../types';
import { db, auth } from '../firebase';
import { ArrowLeftIcon, UserGroupIcon, FunnelIcon, ChartPieIcon, BanknotesIcon, ChevronLeftIcon, ChevronRightIcon, CurrencyDollarIcon, ClockIcon, AcademicCapIcon, CalendarDaysIcon, PlusIcon, XMarkIcon, PencilIcon, ExclamationTriangleIcon } from './Icons';
import { ToastContext } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getShortName, sanitizeFirestore } from '../utils/sanitizeFirestore';


// --- Reusable Components ---
const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

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

const IncomeFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    currentUser: Collaborator;
    transactionToEdit: Transaction | null;
}> = ({ isOpen, onClose, students, currentUser, transactionToEdit }) => {
    const { showToast } = useContext(ToastContext);
    const isEditing = !!transactionToEdit;

    const [studentId, setStudentId] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [discount, setDiscount] = useState<number | ''>('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'pago' | 'pendente'>('pago');
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (transactionToEdit) {
                setStudentId(transactionToEdit.studentId || '');
                setAmount(transactionToEdit.amount + (transactionToEdit.discount || 0)); // Show gross amount
                setDiscount(transactionToEdit.discount || '');
                setPaymentDate(transactionToEdit.date);
                setPaymentMethod(transactionToEdit.paymentMethod);
                setDescription(transactionToEdit.description || '');
                setStatus(transactionToEdit.status || 'pago');
                setDueDate(transactionToEdit.dueDate || '');
            } else {
                setStudentId('');
                setAmount('');
                setDiscount('');
                setPaymentDate(new Date().toISOString().split('T')[0]);
                setPaymentMethod('pix');
                setDescription('');
                setStatus('pago');
                setDueDate('');
            }
        }
    }, [transactionToEdit, isOpen]);


    const finalAmount = useMemo(() => (Number(amount) || 0) - (Number(discount) || 0), [amount, discount]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!amount || finalAmount < 0) {
            showToast('Valor inválido.', 'error');
            return;
        }

        const transactionData = {
            type: 'credit' as const,
            date: paymentDate,
            amount: finalAmount,
            discount: Number(discount) || undefined,
            studentId: studentId || undefined,
            description: description || `Recebimento de ${students.find(s => s.id === studentId)?.name || 'diverso'}`,
            paymentMethod,
            status,
            dueDate: status === 'pendente' ? dueDate : undefined,
            registeredById: isEditing ? transactionToEdit.registeredById : currentUser.id,
        };

        try {
            if (isEditing) {
                await db.collection('transactions').doc(transactionToEdit.id).update(sanitizeFirestore(transactionData as any));
                showToast('Recebimento atualizado com sucesso!', 'success');
            } else {
                await db.collection('transactions').add(sanitizeFirestore(transactionData as any));
                showToast('Recebimento registrado com sucesso!', 'success');
            }
            onClose();
        } catch (error) {
            console.error(error);
            showToast('Erro ao salvar recebimento.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-start p-4 border-b">
                    <h3 className="text-xl font-bold text-zinc-800">{isEditing ? 'Editar Recebimento' : 'Registrar Novo Recebimento'}</h3>
                    <button onClick={onClose} className="p-2 -mt-1 -mr-1 rounded-full text-zinc-400 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="student" className={labelStyle}>Aluno (Opcional)</label>
                            <select id="student" value={studentId} onChange={e => setStudentId(e.target.value)} className={inputStyle}>
                                <option value="">Recebimento Avulso</option>
                                {students.filter(s => s.status === 'matricula').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="paymentDate" className={labelStyle}>Data do Recebimento</label>
                            <input id="paymentDate" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={inputStyle} required />
                        </div>
                        <div>
                            <label htmlFor="amount" className={labelStyle}>Valor Bruto (R$)</label>
                            <input id="amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} className={inputStyle} required />
                        </div>
                        <div>
                            <label htmlFor="discount" className={labelStyle}>Desconto (R$)</label>
                            <input id="discount" type="number" step="0.01" value={discount} onChange={e => setDiscount(e.target.value === '' ? '' : Number(e.target.value))} className={inputStyle} />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-zinc-600">Valor Final: <span className="font-bold text-lg text-secondary">{finalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
                    </div>
                    <div>
                        <label htmlFor="paymentMethod" className={labelStyle}>Forma de Pagamento</label>
                        <select id="paymentMethod" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className={inputStyle} required>
                            <option value="pix">Pix</option>
                            <option value="cartao">Cartão</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="description" className={labelStyle}>Descrição</label>
                        <textarea id="description" rows={2} value={description} onChange={e => setDescription(e.target.value)} className={inputStyle} placeholder="Ex: Pagamento de material, etc." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="status" className={labelStyle}>Status</label>
                            <select id="status" value={status} onChange={e => setStatus(e.target.value as any)} className={inputStyle}>
                                <option value="pago">Pago</option>
                                <option value="pendente">Pendente</option>
                            </select>
                        </div>
                        {status === 'pendente' && (
                             <div className="animate-fade-in-fast">
                                <label htmlFor="dueDate" className={labelStyle}>Prazo de Pagamento</label>
                                <input id="dueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputStyle} />
                            </div>
                        )}
                    </div>
                </main>
                <footer className="p-4 border-t flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 rounded-lg">Cancelar</button>
                    <button type="button" onClick={handleSave} className="py-2 px-6 bg-secondary text-white rounded-lg">Salvar Recebimento</button>
                </footer>
            </div>
        </div>
    );
};


type SettingsTab = 'reports' | 'incomeRecords' | 'remunerations';

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
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [currentUser, setCurrentUser] = useState<Collaborator | null>(null);

    // Fetch data from Firestore
    useEffect(() => {
        const unsubCollaborators = db.collection("collaborators").onSnapshot(snap => {
            const collabs = snap.docs.map(d => ({id: d.id, ...d.data()})) as Collaborator[];
            setCollaborators(collabs);
            const loggedInUser = auth.currentUser;
            if (loggedInUser) {
                setCurrentUser(collabs.find(c => c.id === loggedInUser.uid) || null);
            }
        }, (err) => showToast("Erro ao buscar colaboradores.", "error"));
        const unsubStudents = db.collection("students").onSnapshot(snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})) as Student[]), (err) => showToast("Erro ao buscar alunos.", "error"));
        const unsubProfessionals = db.collection("professionals").onSnapshot(snap => setProfessionals(snap.docs.map(d => ({id: d.id, ...d.data()})) as Professional[]), (err) => showToast("Erro ao buscar profissionais.", "error"));
        const unsubTransactions = db.collection("transactions").orderBy("date", "desc").onSnapshot(snap => setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()})) as Transaction[]), (err) => showToast("Erro ao buscar registros.", "error"));
        const unsubClasses = db.collection("scheduledClasses").onSnapshot(snap => setScheduledClasses(snap.docs.map(d => ({id: d.id, ...d.data()})) as ScheduledClass[]), (err) => showToast("Erro ao buscar aulas.", "error"));
        
        return () => { unsubCollaborators(); unsubStudents(); unsubProfessionals(); unsubTransactions(); unsubClasses(); };
    }, [showToast]);
    
    const studentMap = useMemo(() => new Map(students.map(s => [s.id, s.name])), [students]);
    const professionalMap = useMemo(() => new Map(professionals.map(p => [p.id, p.name])), [professionals]);
    const collaboratorMap = useMemo(() => new Map(collaborators.map(c => [c.id, c.name])), [collaborators]);

    const { monthName, reportMetrics, incomeRecords, remunerationsData } = useMemo(() => {
        const targetDate = new Date();
        targetDate.setDate(1);
        targetDate.setUTCHours(0, 0, 0, 0);
        targetDate.setMonth(targetDate.getMonth() + monthOffset);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();
        const monthName = targetDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        const getFilteredClasses = (data: ScheduledClass[]) =>
            data.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate.getUTCMonth() === targetMonth && itemDate.getUTCFullYear() === targetYear;
            });
        
        const getFilteredTransactions = (data: Transaction[]) =>
            data.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate.getUTCMonth() === targetMonth && itemDate.getUTCFullYear() === targetYear;
            });
        
        // --- Reports Tab ---
        const completedClasses = scheduledClasses.filter(c => c.status === 'completed');
        const classesInMonth = getFilteredClasses(completedClasses);
        
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
        const classesByProfData = Object.entries(profClassCounts).map(([profId, Aulas]) => ({ name: getShortName(professionalMap.get(profId)) || 'Professor desconhecido', Aulas })).sort((a, b) => b.Aulas - a.Aulas);

        const locationCounts = classesInMonth.reduce((acc, cls: ScheduledClass) => {
            const loc = cls.location || 'presencial';
            acc[loc] = (acc[loc] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const locationData = [{ name: 'Online', value: locationCounts.online || 0 }, { name: 'Presencial', value: locationCounts.presencial || 0 }];
        
        // --- Income & Remunerations ---
        const transactionsInMonth = getFilteredTransactions(transactions);
        const incomeTransactions = transactionsInMonth.filter(tx => tx.type === 'credit' || tx.type === 'monthly');
        const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);

        const profRemunerations = professionals.map(prof => {
            const profClassesInMonth = classesInMonth.filter(c => c.professionalId === prof.id);
            const totalHours = profClassesInMonth.reduce((sum, c: ScheduledClass) => sum + (c.duration / 60), 0);
            const earnings = (totalHours * (prof.hourlyRateIndividual || 0)) + (prof.fixedSalary || 0); 
            return { ...prof, classCount: profClassesInMonth.length, earnings };
        });

        const collabRemunerations = collaborators.map(collab => {
            let earnings = 0;
            if (collab.remunerationType === 'fixed') {
                earnings = collab.fixedSalary || 0;
            } else if (collab.remunerationType === 'commission') {
                const collaboratorRevenue = incomeTransactions
                    .filter(tx => tx.registeredById === collab.id)
                    .reduce((sum, tx) => sum + tx.amount, 0);
                earnings = collaboratorRevenue * ((collab.commissionPercentage || 0) / 100);
            }
            return { ...collab, earnings };
        });

        return {
            monthName,
            reportMetrics: {
                avgClassDuration, avgWeeklyHours, avgMonthlyStudents, avgWeeklyStudents,
                classesInMonthCount: classesInMonth.length,
                disciplineData, topStudentsData, classesByProfData, locationData
            },
            incomeRecords: { incomeTransactions, totalIncome },
            remunerationsData: { profRemunerations, collabRemunerations }
        };
    }, [transactions, monthOffset, professionals, scheduledClasses, collaborators, students, studentMap, professionalMap]);
    
    const inactiveStudents = useMemo(() => {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const activeStudents = students.filter(s => s.status === 'matricula');
        
        const completedClassesByStudent = scheduledClasses.reduce((acc, cls) => {
            if (cls.status === 'completed') {
                if (!acc[cls.studentId]) {
                    acc[cls.studentId] = [];
                }
                acc[cls.studentId].push(new Date(cls.date));
            }
            return acc;
        }, {} as Record<string, Date[]>);

        return activeStudents.map(student => {
            const studentClasses = completedClassesByStudent[student.id];
            if (!studentClasses || studentClasses.length === 0) {
                return { student, lastClassDate: null }; // No completed classes ever
            }
            const lastClassDate = new Date(Math.max(...studentClasses.map(d => d.getTime())));
            return { student, lastClassDate };
        }).filter(item => {
            return !item.lastClassDate || item.lastClassDate < ninetyDaysAgo;
        });
    }, [students, scheduledClasses]);


    const handleOpenIncomeModal = (tx: Transaction | null) => {
        setTransactionToEdit(tx);
        setIsIncomeModalOpen(true);
    };

    const handleCloseIncomeModal = () => {
        setTransactionToEdit(null);
        setIsIncomeModalOpen(false);
    }

    const getTransactionDescription = (tx: Transaction): string => {
        if (tx.description) return tx.description;
        const studentName = tx.studentId ? getShortName(studentMap.get(tx.studentId)) : null;
        if (studentName) return `Recebimento de ${studentName}`;
        return `Recebimento avulso`;
    };
    
    const PIE_COLORS = ['#0e7490', '#F39B53', '#34d399', '#f59e0b'];

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view space-y-6">
            {currentUser && <IncomeFormModal isOpen={isIncomeModalOpen} onClose={handleCloseIncomeModal} students={students} currentUser={currentUser} transactionToEdit={transactionToEdit} />}

            <header className="flex items-center gap-4">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-zinc-800">Relatórios e Finanças</h2>
            </header>

            <div className="border-b">
                <nav className="-mb-px flex space-x-6">
                    <TabButton label="Relatórios" icon={ChartPieIcon} isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                    <TabButton label="Recebimentos" icon={BanknotesIcon} isActive={activeTab === 'incomeRecords'} onClick={() => setActiveTab('incomeRecords')} />
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
                            <div className="bg-white p-4 rounded-lg shadow-sm border lg:col-span-2">
                                <h4 className="font-semibold text-zinc-700 mb-2 flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5 text-amber-500" /> Alunos com Inatividade Prolongada ({'>'} 90 dias)</h4>
                                {inactiveStudents.length > 0 ? (
                                    <div className="max-h-48 overflow-y-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-zinc-50"><tr><th className="px-3 py-1 text-left">Aluno</th><th className="px-3 py-1 text-left">Última Aula</th></tr></thead>
                                            <tbody>
                                                {inactiveStudents.map(({ student, lastClassDate }) => (
                                                    <tr key={student.id} className="border-b">
                                                        <td className="px-3 py-1 font-medium">{student.name}</td>
                                                        <td className="px-3 py-1 text-zinc-600">{lastClassDate ? lastClassDate.toLocaleDateString('pt-BR') : 'Nenhuma aula concluída'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-zinc-500 text-center py-4">Nenhum aluno com inatividade prolongada encontrado.</p>
                                )}
                            </div>
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
                                            <span className="font-medium text-zinc-800" title={s.studentName}>{i + 1}. {s.studentName}</span>
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
                 {activeTab === 'incomeRecords' && (
                     <section>
                         <div className="flex items-center justify-between mb-4">
                            <div className='flex items-center gap-4'>
                                <h3 className="text-xl font-semibold text-zinc-700">Registros de Recebimentos</h3>
                                <button onClick={() => handleOpenIncomeModal(null)} className="flex items-center gap-1.5 text-sm bg-secondary text-white font-semibold py-1.5 px-3 rounded-lg hover:bg-secondary-dark"><PlusIcon className="h-4 w-4" /> Registrar Novo</button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-1 rounded-full hover:bg-zinc-100"><ChevronLeftIcon className="h-5 w-5" /></button>
                                <span className="font-semibold text-zinc-800 capitalize w-32 text-center">{monthName}</span>
                                <button onClick={() => setMonthOffset(monthOffset + 1)} disabled={monthOffset >= 0} className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-50"><ChevronRightIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-zinc-200">
                                <thead className="bg-zinc-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Descrição</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Registrado Por</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Valor</th>
                                        <th className="relative px-4 py-2"><span className="sr-only">Ações</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-zinc-200">
                                    {incomeRecords.incomeTransactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td className="px-4 py-3 text-sm text-zinc-600">{new Date(tx.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-zinc-800">{getTransactionDescription(tx)}</td>
                                            <td className="px-4 py-3 text-sm text-zinc-600">{collaboratorMap.get(tx.registeredById) || 'Sistema'}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-right text-green-600">+ R$ {tx.amount.toFixed(2).replace('.', ',')}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => handleOpenIncomeModal(tx)} className="text-secondary hover:underline text-sm font-semibold"><PencilIcon className="h-4 w-4 inline -mt-1"/> Editar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className='bg-zinc-50'>
                                    <tr>
                                        <td colSpan={3} className="px-4 py-2 text-right font-bold text-zinc-700">Total no Mês:</td>
                                        <td className="px-4 py-2 text-right font-bold text-lg text-green-700">R$ {incomeRecords.totalIncome.toFixed(2).replace('.', ',')}</td>
                                        <td className="px-4 py-2"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>
                )}
                 {activeTab === 'remunerations' && (
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-zinc-700">Remunerações</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-1 rounded-full hover:bg-zinc-100"><ChevronLeftIcon className="h-5 w-5" /></button>
                                <span className="font-semibold text-zinc-800 capitalize w-32 text-center">{monthName}</span>
                                <button onClick={() => setMonthOffset(monthOffset + 1)} disabled={monthOffset >= 0} className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-50"><ChevronRightIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold text-zinc-700 mb-2">Professores</h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-zinc-200">
                                        <thead className="bg-zinc-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Professor</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Aulas no Mês</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Remuneração Estimada</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-zinc-200">
                                            {remunerationsData.profRemunerations.map(p => (
                                                <tr key={p.id}>
                                                    <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                                                    <td className="px-4 py-3 text-sm">{p.classCount}</td>
                                                    <td className="px-4 py-3 text-sm text-right font-semibold text-zinc-700">{p.earnings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-zinc-700 mb-2">Colaboradores</h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-zinc-200">
                                        <thead className="bg-zinc-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Colaborador</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Tipo</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Remuneração Estimada</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-zinc-200">
                                            {remunerationsData.collabRemunerations.map(c => (
                                                <tr key={c.id}>
                                                    <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                                                    <td className="px-4 py-3 text-sm capitalize">{c.remunerationType}</td>
                                                    <td className="px-4 py-3 text-sm text-right font-semibold text-zinc-700">{c.earnings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
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