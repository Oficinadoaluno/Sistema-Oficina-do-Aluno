import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Transaction, Student, Professional, Collaborator, ClassGroup, DayOfWeek, ScheduledClass } from '../types';
import { db } from '../firebase';
import { ArrowLeftIcon, PlusIcon, Cog6ToothIcon, ArrowUpIcon, ArrowDownIcon, CurrencyDollarIcon, ChevronLeftIcon, ChevronRightIcon, BanknotesIcon, ChevronDownIcon } from './Icons';
import { ToastContext } from '../App';
import AddTransactionModal from './AddTransactionModal';
import ManageCategoriesModal from './ManageCategoriesModal';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

const RemunerationList: React.FC<{
    professionals: Professional[];
    scheduledClasses: ScheduledClass[];
    classGroups: ClassGroup[];
    students: Student[];
    monthOffset: number;
    monthName: string;
}> = ({ professionals, scheduledClasses, classGroups, students, monthOffset, monthName }) => {
    const [expandedProfId, setExpandedProfId] = useState<string | null>(null);

    const remunerations = useMemo(() => {
        const targetDate = new Date();
        targetDate.setDate(1);
        targetDate.setUTCHours(0, 0, 0, 0);
        targetDate.setMonth(targetDate.getMonth() + monthOffset);
        const targetMonth = targetDate.getUTCMonth();
        const targetYear = targetDate.getUTCFullYear();

        return professionals.filter(p => p.status === 'ativo').map(prof => {
            const individualClasses = scheduledClasses.filter(c => {
                const classDate = new Date(c.date);
                return c.professionalId === prof.id &&
                       classDate.getUTCMonth() === targetMonth &&
                       classDate.getUTCFullYear() === targetYear &&
                       c.status !== 'canceled';
            });

            const individualHours = individualClasses.reduce((sum, c) => sum + (c.duration / 60), 0);
            const individualEarnings = individualHours * (prof.hourlyRateIndividual || 0);

            const profClassGroups = classGroups.filter(g => g.professionalId === prof.id && g.status === 'active');
            let groupHours = 0;
            const groupClassesDetails: { date: string; name: string; duration: number; value: number }[] = [];

            const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
            const dayNameToIndex: Record<DayOfWeek, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };

            profClassGroups.forEach(group => {
                if (group.schedule.type === 'recurring' && group.schedule.days) {
                    for (let day = 1; day <= daysInMonth; day++) {
                        const currentDate = new Date(Date.UTC(targetYear, targetMonth, day));
                        const dayOfWeekIndex = currentDate.getUTCDay(); 
                        const dayOfWeekName = Object.keys(dayNameToIndex).find(key => dayNameToIndex[key as DayOfWeek] === dayOfWeekIndex) as DayOfWeek;
                        
                        if (group.schedule.days[dayOfWeekName]) {
                            groupHours += group.creditsToDeduct;
                            groupClassesDetails.push({
                                date: currentDate.toISOString().split('T')[0],
                                name: group.name,
                                duration: group.creditsToDeduct * 60,
                                value: group.creditsToDeduct * (prof.hourlyRateGroup || 0)
                            });
                        }
                    }
                }
            });
            const groupEarnings = groupHours * (prof.hourlyRateGroup || 0);
            const totalEarnings = individualEarnings + groupEarnings;

            return {
                profId: prof.id,
                profName: prof.name,
                totalEarnings,
                details: {
                    individual: individualClasses.map(c => ({
                        date: c.date,
                        studentName: students.find(s => s.id === c.studentId)?.name || 'N/A',
                        duration: c.duration,
                        value: (c.duration / 60) * (prof.hourlyRateIndividual || 0)
                    })),
                    group: groupClassesDetails
                }
            };
        });
    }, [professionals, scheduledClasses, classGroups, students, monthOffset]);

    return (
        <section className="animate-fade-in-view">
            <h3 className="text-xl font-semibold text-zinc-700 mb-4">Remuneração Prevista - {monthName}</h3>
            <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-zinc-50">
                        <tr>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Profissional</th>
                            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Valor Previsto</th>
                            <th scope="col" className="relative px-4 py-2"><span className="sr-only">Ações</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-200">
                        {remunerations.map(rem => (
                            <React.Fragment key={rem.profId}>
                            <tr>
                                <td className="px-4 py-3 font-medium text-zinc-800">{rem.profName}</td>
                                <td className="px-4 py-3 font-bold text-zinc-800 text-right">R$ {rem.totalEarnings.toFixed(2).replace('.', ',')}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => setExpandedProfId(expandedProfId === rem.profId ? null : rem.profId)} className="text-secondary font-semibold text-sm flex items-center gap-1">
                                        <span>Detalhes</span>
                                        <ChevronDownIcon open={expandedProfId === rem.profId} className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                            {expandedProfId === rem.profId && (
                                <tr>
                                    <td colSpan={3} className="p-4 bg-zinc-50">
                                        <div className="space-y-4">
                                            <div>
                                                <h5 className="font-semibold text-zinc-700 mb-1">Aulas Individuais</h5>
                                                {rem.details.individual.length > 0 ? (
                                                    <ul className="text-sm space-y-1">{rem.details.individual.map((c, i) => <li key={`ind-${i}`} className="flex justify-between"><span>{new Date(c.date).toLocaleDateString('pt-BR', {timeZone:'UTC'})} - {c.studentName} ({c.duration} min)</span> <span>+ R$ {c.value.toFixed(2).replace('.',',')}</span></li>)}</ul>
                                                ) : <p className="text-sm text-zinc-500">Nenhuma aula individual no mês.</p>}
                                            </div>
                                            <div>
                                                 <h5 className="font-semibold text-zinc-700 mb-1">Aulas em Turma</h5>
                                                {rem.details.group.length > 0 ? (
                                                     <ul className="text-sm space-y-1">{rem.details.group.map((c, i) => <li key={`grp-${i}`} className="flex justify-between"><span>{new Date(c.date).toLocaleDateString('pt-BR', {timeZone:'UTC'})} - {c.name} ({c.duration} min)</span> <span>+ R$ {c.value.toFixed(2).replace('.',',')}</span></li>)}</ul>
                                                ) : <p className="text-sm text-zinc-500">Nenhuma aula em turma no mês.</p>}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
};


const FinancialView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { showToast } = useContext(ToastContext);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
    // FIX: Add state for scheduledClasses to fix 'Cannot find name' error.
    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
    const [categories, setCategories] = useState<{ income: string[], expenses: string[] }>({ income: [], expenses: [] });
    
    const [loading, setLoading] = useState(true);
    const [monthOffset, setMonthOffset] = useState(0); // 0 for current month, -1 for last month, etc.
    const [view, setView] = useState<'list' | 'remuneration'>('list');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    useEffect(() => {
        const unsubTransactions = db.collection('transactions').orderBy('date', 'desc').onSnapshot(snap => {
            setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
        }, (err) => {
            console.error("Error fetching transactions:", err);
            showToast("Erro ao buscar transações.", "error");
        });

        const unsubStudents = db.collection('students').onSnapshot(snap => {
            setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
        });
        
        const unsubProfessionals = db.collection('professionals').onSnapshot(snap => {
            setProfessionals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Professional)));
        });

        const unsubCollaborators = db.collection('collaborators').onSnapshot(snap => {
            setCollaborators(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator)));
        });

        const unsubClassGroups = db.collection('classGroups').onSnapshot(snap => {
            setClassGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassGroup)));
        });
        
        // FIX: Fetch scheduledClasses data from Firestore.
        const unsubScheduledClasses = db.collection('scheduledClasses').onSnapshot(snap => {
            setScheduledClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduledClass)));
        }, (err) => {
            console.error("Error fetching scheduled classes:", err);
            showToast("Erro ao buscar aulas agendadas.", "error");
        });

        const unsubSettings = db.collection('settings').doc('financial').onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                setCategories({
                    income: data?.incomeCategories || [],
                    expenses: data?.expenseCategories || [],
                });
            }
             setLoading(false);
        });

        return () => {
            unsubTransactions();
            unsubStudents();
            unsubProfessionals();
            unsubCollaborators();
            unsubSettings();
            unsubClassGroups();
            // FIX: Add cleanup for the new subscription.
            unsubScheduledClasses();
        };
    }, [showToast]);
    
    const { currentMonthTransactions, totalIncome, totalExpenses, balance, monthName } = useMemo(() => {
        const targetDate = new Date();
        targetDate.setDate(1);
        targetDate.setUTCHours(0, 0, 0, 0);
        targetDate.setMonth(targetDate.getMonth() + monthOffset);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();

        const monthName = targetDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        const filteredTransactions = transactions.filter(tx => {
            if (!tx.date) return false;
            const txDate = new Date(tx.date);
            return txDate.getUTCMonth() === targetMonth && txDate.getUTCFullYear() === targetYear;
        });

        let totalIncome = 0;
        let totalExpenses = 0;

        filteredTransactions.forEach(tx => {
            if (tx.type === 'credit' || tx.type === 'monthly') {
                totalIncome += tx.amount;
            } else if (tx.type === 'payment') {
                totalExpenses += tx.amount;
            }
        });
        
        const balance = totalIncome - totalExpenses;
        return { currentMonthTransactions: filteredTransactions, totalIncome, totalExpenses, balance, monthName };
    }, [transactions, monthOffset]);

    const collaboratorMap = useMemo(() => 
        new Map(collaborators.map(c => [c.id, c.name])), 
    [collaborators]);

    const getTransactionDetails = (tx: Transaction) => {
        let source = tx.sourceDest || 'N/A';
        let description = tx.description || 'Transação do sistema';

        const studentMap = new Map(students.map(s => [s.id, s]));
        const professionalMap = new Map(professionals.map(p => [p.id, p]));

        if (tx.studentId && studentMap.has(tx.studentId)) {
            source = studentMap.get(tx.studentId)!.name;
            if (tx.type === 'credit') description = `Compra de ${tx.credits || 0} créditos`;
            if (tx.type === 'monthly') description = `Mensalidade - ${tx.month || tx.category || 'N/A'}`;
        } else if (tx.professionalId && professionalMap.has(tx.professionalId)) {
            source = professionalMap.get(tx.professionalId)!.name;
            if (tx.type === 'payment') description = `Pagamento - ${tx.month || tx.category || 'N/A'}`;
        }
        
        return { source, description };
    };
    
    const handleSaveTransaction = async (data: any) => {
        try {
            await db.collection('transactions').add(sanitizeFirestore(data));
            showToast('Transação salva com sucesso!', 'success');
            setIsAddModalOpen(false);
        } catch (error) {
            showToast('Erro ao salvar transação.', 'error');
            console.error(error);
        }
    };
    
    const updateCategoriesInFirestore = async (newCategories: { income: string[], expenses: string[] }) => {
        try {
            await db.collection('settings').doc('financial').set({
                incomeCategories: newCategories.income,
                expenseCategories: newCategories.expenses
            }, { merge: true });
            showToast('Categorias atualizadas!', 'success');
        } catch (error) {
            showToast('Erro ao atualizar categorias.', 'error');
            console.error(error);
        }
    };

    const handleCreateCategory = (type: 'income' | 'expenses', name: string) => {
        const updated = { ...categories };
        updated[type] = [...updated[type], name].sort();
        updateCategoriesInFirestore(updated);
    };
    
    const handleDeleteCategory = (type: 'income' | 'expenses', name: string) => {
        const updated = { ...categories };
        updated[type] = updated[type].filter(cat => cat !== name);
        updateCategoriesInFirestore(updated);
    };

    const handleUpdateCategory = (type: 'income' | 'expenses', oldName: string, newName: string) => {
        const updated = { ...categories };
        const index = updated[type].indexOf(oldName);
        if (index > -1) {
            updated[type][index] = newName;
            updated[type].sort();
            updateCategoriesInFirestore(updated);
        }
    };

    return (
        <>
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <header className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={view === 'remuneration' ? () => setView('list') : onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors"><ArrowLeftIcon className="h-6 w-6" /></button>
                    <h2 className="text-2xl font-bold text-zinc-800">Financeiro</h2>
                </div>
                {view === 'list' && (
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsCategoryModalOpen(true)} className="flex items-center gap-2 text-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold py-2 px-3 rounded-lg"><Cog6ToothIcon className="h-5 w-5"/>Gerenciar Categorias</button>
                    <button onClick={() => setView('remuneration')} className="flex items-center gap-2 text-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold py-2 px-3 rounded-lg"><BanknotesIcon className="h-5 w-5"/>Remuneração</button>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 text-sm bg-primary text-white font-semibold py-2 px-3 rounded-lg hover:bg-primary-dark"><PlusIcon className="h-5 w-5"/>Nova Transação</button>
                </div>
                )}
            </header>

            {view === 'list' && (
            <>
            <section className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-zinc-700">Resumo Mensal</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-1 rounded-full hover:bg-zinc-100"><ChevronLeftIcon className="h-5 w-5" /></button>
                        <span className="font-semibold text-zinc-800 capitalize w-32 text-center">{monthName}</span>
                        <button onClick={() => setMonthOffset(monthOffset + 1)} disabled={monthOffset >= 0} className="p-1 rounded-full hover:bg-zinc-100 disabled:opacity-50"><ChevronRightIcon className="h-5 w-5" /></button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-4">
                        <div className="bg-green-100 p-3 rounded-full"><ArrowUpIcon className="h-6 w-6 text-green-600" /></div>
                        <div><h4 className="text-sm font-medium text-green-800">Receitas</h4><p className="text-2xl font-bold text-green-700">R$ {totalIncome.toFixed(2).replace('.', ',')}</p></div>
                    </div>
                     <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-4">
                        <div className="bg-red-100 p-3 rounded-full"><ArrowDownIcon className="h-6 w-6 text-red-600" /></div>
                        <div><h4 className="text-sm font-medium text-red-800">Despesas</h4><p className="text-2xl font-bold text-red-700">R$ {totalExpenses.toFixed(2).replace('.', ',')}</p></div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center gap-4">
                         <div className="bg-blue-100 p-3 rounded-full"><CurrencyDollarIcon className="h-6 w-6 text-blue-600"/></div>
                         <div><h4 className="text-sm font-medium text-blue-800">Saldo</h4><p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>R$ {balance.toFixed(2).replace('.', ',')}</p></div>
                    </div>
                </div>
            </section>
            
            <main className="flex-grow overflow-y-auto">
                 <h3 className="text-lg font-semibold text-zinc-700 mb-2">Transações do Mês</h3>
                {loading ? <p className="text-center p-8 text-zinc-500">Carregando transações...</p> :
                <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-zinc-200">
                        <thead className="bg-zinc-50">
                            <tr>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Origem/Destino</th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Descrição</th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Registrado Por</th>
                                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-zinc-200">
                            {currentMonthTransactions.map(tx => {
                                const { source, description } = getTransactionDetails(tx);
                                const isIncome = tx.type === 'credit' || tx.type === 'monthly';
                                const registeredBy = tx.registeredById ? collaboratorMap.get(tx.registeredById) || 'N/A' : 'Sistema';
                                return (
                                <tr key={tx.id}>
                                    <td className="px-4 py-3 text-sm text-zinc-600">{new Date(tx.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-zinc-800">{source}</td>
                                    <td className="px-4 py-3 text-sm text-zinc-600">{description}</td>
                                    <td className="px-4 py-3 text-sm text-zinc-600">{registeredBy}</td>
                                    <td className={`px-4 py-3 text-sm font-bold text-right ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                        {isIncome ? '+' : '-'} R$ {tx.amount.toFixed(2).replace('.', ',')}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    {currentMonthTransactions.length === 0 && <p className="p-4 text-center text-zinc-500">Nenhuma transação neste mês.</p>}
                </div>}
            </main>
            </>
            )}

            {view === 'remuneration' && (
                <main className="flex-grow overflow-y-auto">
                    <RemunerationList
                        professionals={professionals}
                        scheduledClasses={scheduledClasses}
                        classGroups={classGroups}
                        students={students}
                        monthOffset={monthOffset}
                        monthName={monthName}
                    />
                </main>
            )}
        </div>
        <AddTransactionModal 
            isOpen={isAddModalOpen} 
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleSaveTransaction}
            incomeCategories={categories.income}
            expenseCategories={categories.expenses}
            students={students}
            professionals={professionals}
            collaborators={collaborators}
        />
         <ManageCategoriesModal
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            categories={categories}
            onCreate={handleCreateCategory}
            onDelete={handleDeleteCategory}
            onUpdate={handleUpdateCategory}
        />
        </>
    );
};
export default FinancialView;