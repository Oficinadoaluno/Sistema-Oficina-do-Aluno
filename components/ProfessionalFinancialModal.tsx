
import React, { useState, useEffect } from 'react';
import { Professional, Transaction } from '../types';
// FIX: Remove mock data import and add firebase imports
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { XMarkIcon } from './Icons';
import TransactionItem from './TransactionItem';

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// --- Helper Components ---
const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

// --- Main Modal Component ---
interface ProfessionalFinancialModalProps {
    isOpen: boolean;
    onClose: () => void;
    professional: Professional;
}

const ProfessionalFinancialModal: React.FC<ProfessionalFinancialModalProps> = ({ isOpen, onClose, professional }) => {
    const [activeTab, setActiveTab] = useState<'historico' | 'pagamento'>('historico');
    // FIX: Add state for transactions fetched from Firestore
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // FIX: Fetch payments from Firestore instead of using mock data
    useEffect(() => {
        if (!isOpen) return;

        // Assuming transactions for professionals have a 'professionalId' field and type 'payment'
        const q = query(collection(db, "transactions"), where("type", "==", "payment"), where("professionalId", "==", professional.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
            setTransactions(paymentsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        });

        return () => unsubscribe();
    }, [isOpen, professional.id]);


    if (!isOpen) return null;

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        alert('Pagamento registrado com sucesso! (Simulação)');
        setActiveTab('historico');
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <header className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-800">Financeiro</h2>
                        <p className="text-sm text-zinc-500">{professional.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100">
                        <XMarkIcon />
                    </button>
                </header>

                {/* Tabs */}
                <nav className="flex border-b">
                    <button onClick={() => setActiveTab('historico')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'historico' ? 'text-secondary border-b-2 border-secondary' : 'text-zinc-500 hover:bg-zinc-50'}`}>Histórico</button>
                    <button onClick={() => setActiveTab('pagamento')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'pagamento' ? 'text-secondary border-b-2 border-secondary' : 'text-zinc-500 hover:bg-zinc-50'}`}>Registrar Pagamento</button>
                </nav>

                {/* Content */}
                <main className="flex-grow overflow-y-auto">
                    {activeTab === 'historico' && (
                        <div className="divide-y">
                            {/* FIX: Use transactions from state */}
                            {transactions.length > 0 ? (
                                transactions.map(tx => <TransactionItem key={tx.id} transaction={tx} type="professional" />)
                            ) : (
                                <p className="p-6 text-center text-zinc-500">Nenhum pagamento registrado.</p>
                            )}
                        </div>
                    )}
                    {activeTab === 'pagamento' && (
                        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                             <div>
                                <label htmlFor="month" className={labelStyle}>Mês de Referência</label>
                                <select id="month" name="month" className={inputStyle} defaultValue={months[new Date().getMonth() - 1]}>
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="date" className={labelStyle}>Data do Pagamento</label>
                                <input type="date" id="date" name="date" className={inputStyle} defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div>
                                <label htmlFor="amount" className={labelStyle}>Valor (R$)</label>
                                <input type="number" id="amount" name="amount" step="0.01" className={inputStyle} placeholder="ex: 1500,00" required/>
                            </div>
                             <div>
                                <label htmlFor="paymentMethod" className={labelStyle}>Forma de Pagamento</label>
                                <select id="paymentMethod" name="paymentMethod" className={inputStyle}>
                                    <option value="pix">Pix</option>
                                    <option value="transferencia">Transferência Bancária</option>
                                </select>
                            </div>
                             <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setActiveTab('historico')} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                                <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark">Salvar Pagamento</button>
                            </div>
                        </form>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ProfessionalFinancialModal;
