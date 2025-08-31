import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Transaction } from '../types';
import { db } from '../firebase';
import { ToastContext } from '../App';
import { ArrowLeftIcon, ExclamationTriangleIcon, ArrowUpIcon, ArrowDownIcon, BanknotesIcon } from './Icons';

// --- Pure Helper Functions (for testability) ---

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

/**
 * Calculates financial summary from a list of transactions.
 * 'credit' and 'monthly' types are considered income.
 * 'payment' type is considered an expense.
 *
 * @param transactions An array of transaction objects.
 * @returns An object with totalIncome, totalExpenses, and balance.
 */
const calculateFinancialSummary = (transactions: Transaction[]): FinancialSummary => {
  const summary = transactions.reduce((acc, tx) => {
    if (tx.type === 'credit' || tx.type === 'monthly') {
      acc.totalIncome += tx.amount;
    } else if (tx.type === 'payment') {
      acc.totalExpenses += tx.amount;
    }
    return acc;
  }, { totalIncome: 0, totalExpenses: 0 });

  return {
    ...summary,
    balance: summary.totalIncome - summary.totalExpenses,
  };
};

const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// --- Child Components ---

const SummaryCard: React.FC<{ title: string; value: number; icon: React.ElementType; colorClasses: string }> = ({ title, value, icon: Icon, colorClasses }) => (
    <div className={`p-4 rounded-lg shadow-sm border-l-4 ${colorClasses}`}>
        <div className="flex items-center gap-4">
            <Icon className="h-8 w-8 text-zinc-500" />
            <div>
                <p className="text-sm font-medium text-zinc-600">{title}</p>
                <p className="text-2xl font-bold text-zinc-800">{formatCurrency(value)}</p>
            </div>
        </div>
    </div>
);

// --- Main View Component ---
interface FinancialViewProps {
    onBack: () => void;
}

const FinancialView: React.FC<FinancialViewProps> = ({ onBack }) => {
    const { showToast } = useContext(ToastContext);

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [visibleCount, setVisibleCount] = useState<number>(15);

    useEffect(() => {
        setLoading(true);
        const q = db.collection("transactions").orderBy("date", "desc");

        const unsubscribe = q.onSnapshot(
            (snapshot) => {
                const transactionsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Transaction[];
                setTransactions(transactionsData);
                setError(null);
                setLoading(false);
            },
            (err) => {
                console.error("Firestore FinancialView Error:", err);
                let message = "Ocorreu um erro ao buscar os dados financeiros. Tente novamente.";
                if (err.code === 'failed-precondition') {
                    message = "Erro de configuração: Um índice para esta consulta está faltando. Contate o suporte técnico para criar o índice necessário para 'transactions' ordenado por 'date'.";
                } else if (err.code === 'permission-denied') {
                    message = "Você não tem permissão para acessar os dados financeiros. Verifique as regras de segurança do Firestore.";
                } else if (err.code === 'unavailable') {
                    message = "Erro de conexão. Verifique sua internet e tente novamente.";
                }
                setError(message);
                setLoading(false);
                showToast(message, 'error');
            }
        );

        return () => unsubscribe();
    }, [showToast]);

    const summary = useMemo(() => calculateFinancialSummary(transactions), [transactions]);
    const visibleTransactions = useMemo(() => transactions.slice(0, visibleCount), [transactions, visibleCount]);

    const loadMore = () => {
        setVisibleCount(prev => prev + 15);
    };

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col items-center justify-center animate-fade-in-view">
                <p className="text-zinc-500 font-semibold text-lg">Carregando dados financeiros...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col items-center justify-center text-center animate-fade-in-view">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mb-4" />
                <h3 className="text-xl font-bold text-red-600">Falha ao Carregar Dados</h3>
                <p className="text-zinc-600 mt-2 max-w-md">{error}</p>
                <button onClick={onBack} className="mt-6 py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">
                    Voltar ao Painel
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view space-y-6">
            <header className="flex items-center gap-4 flex-shrink-0">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-zinc-800">Visão Financeira Geral</h2>
            </header>

            <main className="flex-grow overflow-y-auto space-y-6 pr-2 -mr-2">
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SummaryCard title="Receita Total" value={summary.totalIncome} icon={ArrowUpIcon} colorClasses="border-green-400 bg-green-50/70" />
                    <SummaryCard title="Despesa Total" value={summary.totalExpenses} icon={ArrowDownIcon} colorClasses="border-red-400 bg-red-50/70" />
                    <SummaryCard title="Saldo Atual" value={summary.balance} icon={BanknotesIcon} colorClasses={summary.balance >= 0 ? "border-blue-400 bg-blue-50/70" : "border-orange-400 bg-orange-50/70"} />
                </section>

                <section>
                    <h3 className="text-xl font-semibold text-zinc-700 mb-4">Histórico de Transações</h3>
                    {transactions.length === 0 ? (
                        <div className="text-center py-16 bg-zinc-50 rounded-lg">
                            <p className="text-zinc-500">Nenhuma transação registrada ainda.</p>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-zinc-200">
                                <thead className="bg-zinc-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Descrição</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-zinc-200">
                                    {visibleTransactions.map(tx => {
                                        const isIncome = tx.type === 'credit' || tx.type === 'monthly';
                                        const description = tx.type === 'credit' ? `Compra de ${tx.credits || 0} créditos` : tx.type === 'monthly' ? `Mensalidade ${tx.month || ''}` : `Pagamento/Repasse`;
                                        return (
                                            <tr key={tx.id} className="hover:bg-zinc-50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-600">{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-zinc-800">{description}</td>
                                                <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold text-right ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                     {transactions.length > visibleCount && (
                        <div className="mt-4 text-center">
                            <button onClick={loadMore} className="py-2 px-5 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark transition-colors">
                                Carregar mais
                            </button>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default FinancialView;
