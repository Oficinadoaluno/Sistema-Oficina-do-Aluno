import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Transaction, Student, Professional } from '../types';
import { db } from '../firebase';
import { ArrowLeftIcon, PlusIcon, Cog6ToothIcon, ArrowUpIcon, ArrowDownIcon, CurrencyDollarIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { ToastContext } from '../App';

const FinancialView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { showToast } = useContext(ToastContext);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [students, setStudents] = useState<Map<string, Student>>(new Map());
    const [professionals, setProfessionals] = useState<Map<string, Professional>>(new Map());
    const [loading, setLoading] = useState(true);

    const [monthOffset, setMonthOffset] = useState(0); // 0 for current month, -1 for last month, etc.

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [transactionsSnap, studentsSnap, professionalsSnap] = await Promise.all([
                    db.collection('transactions').orderBy('date', 'desc').get(),
                    db.collection('students').get(),
                    db.collection('professionals').get(),
                ]);

                setTransactions(transactionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
                
                const studentMap = new Map<string, Student>();
                studentsSnap.docs.forEach(doc => studentMap.set(doc.id, { id: doc.id, ...doc.data() } as Student));
                setStudents(studentMap);
                
                const professionalMap = new Map<string, Professional>();
                professionalsSnap.docs.forEach(doc => professionalMap.set(doc.id, { id: doc.id, ...doc.data() } as Professional));
                setProfessionals(professionalMap);
                
            } catch (err: any) {
                 console.error(`Error fetching financial data:`, err);
                 showToast(`Erro ao buscar dados financeiros.`, "error");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [showToast]);
    
    const { currentMonthTransactions, totalIncome, totalExpenses, balance, monthName } = useMemo(() => {
        const targetDate = new Date();
        targetDate.setDate(1); // Avoid issues with end of month
        targetDate.setMonth(targetDate.getMonth() + monthOffset);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();

        const monthName = targetDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        const currentMonthTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            // Adjust for timezone issues by comparing year and month from UTC date
            return txDate.getUTCMonth() === targetMonth && txDate.getUTCFullYear() === targetYear;
        });

        let totalIncome = 0;
        let totalExpenses = 0;

        currentMonthTransactions.forEach(tx => {
            if (tx.type === 'credit' || tx.type === 'monthly') {
                totalIncome += tx.amount;
            } else if (tx.type === 'payment') {
                totalExpenses += tx.amount;
            }
        });
        
        const balance = totalIncome - totalExpenses;
        return { currentMonthTransactions, totalIncome, totalExpenses, balance, monthName };
    }, [transactions, monthOffset]);

    const getTransactionDetails = (tx: Transaction) => {
        let source = 'N/A';
        let description = 'Transação do sistema';

        if (tx.studentId && students.has(tx.studentId)) {
            source = students.get(tx.studentId)!.name;
            if (tx.type === 'credit') description = `Compra de ${tx.credits || 0} créditos`;
            if (tx.type === 'monthly') description = `Mensalidade - ${tx.month || 'N/A'}`;
        } else if (tx.professionalId && professionals.has(tx.professionalId)) {
            source = professionals.get(tx.professionalId)!.name;
            if (tx.type === 'payment') description = `Pagamento - ${tx.month || 'N/A'}`;
        }
        
        return { source, description };
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <header className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors"><ArrowLeftIcon className="h-6 w-6" /></button>
                    <h2 className="text-2xl font-bold text-zinc-800">Financeiro</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button disabled className="flex items-center gap-2 text-sm bg-zinc-100 text-zinc-500 font-semibold py-2 px-3 rounded-lg cursor-not-allowed"><Cog6ToothIcon className="h-5 w-5"/>Gerenciar Categorias</button>
                    <button disabled className="flex items-center gap-2 text-sm bg-primary/80 text-white font-semibold py-2 px-3 rounded-lg cursor-not-allowed"><PlusIcon className="h-5 w-5"/>Nova Transação</button>
                </div>
            </header>

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
                                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-zinc-200">
                            {currentMonthTransactions.map(tx => {
                                const { source, description } = getTransactionDetails(tx);
                                const isIncome = tx.type === 'credit' || tx.type === 'monthly';
                                return (
                                <tr key={tx.id}>
                                    <td className="px-4 py-3 text-sm text-zinc-600">{new Date(tx.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-zinc-800">{source}</td>
                                    <td className="px-4 py-3 text-sm text-zinc-600">{description}</td>
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
        </div>
    );
};
export default FinancialView;