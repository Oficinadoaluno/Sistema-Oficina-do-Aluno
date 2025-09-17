import React, { useState, useEffect, useContext } from 'react';
import { Professional, Transaction } from '../types';
import { db } from '../firebase';
import { XMarkIcon } from './Icons';
import TransactionItem from './TransactionItem';
import { ToastContext } from '../App';

// --- Main Modal Component ---
interface ProfessionalFinancialModalProps {
    isOpen: boolean;
    onClose: () => void;
    professional: Professional;
}

const ProfessionalFinancialModal: React.FC<ProfessionalFinancialModalProps> = ({ isOpen, onClose, professional }) => {
    const { showToast } = useContext(ToastContext);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        const q = db.collection("transactions").where("type", "==", "payment").where("professionalId", "==", professional.id);
        const unsubscribe = q.onSnapshot(
            (snapshot) => {
                const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
                setTransactions(paymentsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            },
            (error) => {
                console.error("Firestore (ProfessionalPayments) Error:", error);
                if (error.code === 'permission-denied') {
                    showToast("Você não tem permissão para ver este histórico de pagamentos.", "error");
                } else if (error.code === 'failed-precondition') {
                    showToast("Erro de configuração do banco de dados (índice ausente).", "error");
                } else if (error.code === 'unavailable') {
                    showToast("Erro de conexão. Verifique sua internet.", "error");
                } else {
                    showToast("Ocorreu um erro ao buscar os pagamentos.", "error");
                }
            }
        );

        return () => unsubscribe();
    }, [isOpen, professional.id, showToast]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <header className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-800">Histórico de Pagamentos</h2>
                        <p className="text-sm text-zinc-500">{professional.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100">
                        <XMarkIcon />
                    </button>
                </header>

                {/* Content */}
                <main className="flex-grow overflow-y-auto">
                    <div className="divide-y">
                        {transactions.length > 0 ? (
                            transactions.map(tx => <TransactionItem key={tx.id} transaction={tx} type="professional" />)
                        ) : (
                            <p className="p-6 text-center text-zinc-500">Nenhum pagamento registrado.</p>
                        )}
                    </div>
                </main>
                 <footer className="p-4 border-t bg-zinc-50 rounded-b-xl text-right">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-200 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-300 transition-colors">Fechar</button>
                </footer>
            </div>
        </div>
    );
};

export default ProfessionalFinancialModal;
