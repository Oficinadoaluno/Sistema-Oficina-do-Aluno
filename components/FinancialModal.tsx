
import React, { useState, useEffect, useContext } from 'react';
import { Student, Transaction, PaymentMethod, Collaborator } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { XMarkIcon } from './Icons';
import TransactionItem from './TransactionItem';
import { ToastContext } from '../App';

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

interface FinancialModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student;
    currentUser: Collaborator;
}

const FinancialModal: React.FC<FinancialModalProps> = ({ isOpen, onClose, student, currentUser }) => {
    const { showToast } = useContext(ToastContext);
    const [activeTab, setActiveTab] = useState<'historico' | 'creditos' | 'mensalidade'>('historico');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        const q = query(collection(db, "transactions"), where("studentId", "==", student.id));
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
                setTransactions(txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            },
            (error) => {
                console.error("Firestore (FinancialModal) Error:", error);
                if (error.code === 'permission-denied') {
                    console.error("Erro de Permissão: Verifique as regras para a coleção 'transactions'.");
                    showToast("Você não tem permissão para ver o histórico financeiro.", "error");
                } else if (error.code === 'failed-precondition') {
                    console.error("Erro de Pré-condição: Índice ausente para a consulta de transações. Verifique o console.");
                    showToast("Erro de configuração do banco de dados (índice ausente).", "error");
                } else if (error.code === 'unavailable') {
                    console.error("Erro de Rede: Não foi possível conectar ao Firestore.");
                    showToast("Erro de conexão. Verifique sua internet.", "error");
                } else {
                    showToast("Ocorreu um erro ao buscar o histórico financeiro.", "error");
                }
            }
        );

        return () => unsubscribe();
    }, [isOpen, student.id, showToast]);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        const transactionData: Omit<Transaction, 'id'> = {
            type: activeTab === 'creditos' ? 'credit' : 'monthly',
            date: data.date as string,
            amount: Number(data.amount),
            credits: activeTab === 'creditos' ? Number(data.credits) : undefined,
            month: activeTab === 'mensalidade' ? data.month as string : undefined,
            paymentMethod: data.paymentMethod as PaymentMethod,
            cardDetails: data.paymentMethod === 'cartao' ? {
                method: data.cardMethod as 'maquininha' | 'link' | 'outro',
                installments: Number(data.installments) || undefined,
                fees: Number(data.fees) || undefined,
            } : undefined,
            discount: Number(data.discount) || undefined,
            surcharge: Number(data.surcharge) || undefined,
            registeredById: currentUser.id,
            studentId: student.id,
        };

        try {
            await addDoc(collection(db, "transactions"), transactionData);
            if (activeTab === 'creditos') {
                const studentRef = doc(db, "students", student.id);
                const newCredits = (student.credits || 0) + (transactionData.credits || 0);
                await updateDoc(studentRef, { credits: newCredits });
            }
            showToast('Registro salvo com sucesso!', 'success');
            setActiveTab('historico');
        } catch (error: any) {
            console.error("Error saving transaction:", error);
            if (error.code === 'permission-denied') {
                showToast("Você não tem permissão para salvar esta transação.", "error");
            } else if (error.code === 'unavailable') {
                showToast("Erro de conexão. Verifique sua internet e tente novamente.", "error");
            } else {
                showToast("Falha ao salvar registro.", 'error');
            }
        }
    };

    if (!isOpen) return null;

    const renderFormContent = () => (
        <>
             <div><label htmlFor="date" className={labelStyle}>Data</label><input type="date" id="date" name="date" className={inputStyle} defaultValue={new Date().toISOString().split('T')[0]} /></div>
            <div><label htmlFor="amount" className={labelStyle}>Valor (R$)</label><input type="number" id="amount" name="amount" step="0.01" className={inputStyle} placeholder="ex: 350,00" required /></div>
            <div><label htmlFor="paymentMethod" className={labelStyle}>Forma de Pagamento</label><select id="paymentMethod" name="paymentMethod" className={inputStyle} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}><option value="pix">Pix</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option><option value="outro">Outro</option></select></div>
            {paymentMethod === 'cartao' && (<><div className="grid grid-cols-2 gap-4"><div><label htmlFor="cardMethod" className={labelStyle}>Método do Cartão</label><select id="cardMethod" name="cardMethod" className={inputStyle}><option value="maquininha">Maquininha</option><option value="link">Link de Pagamento</option><option value="outro">Outro</option></select></div><div><label htmlFor="installments" className={labelStyle}>Nº de Parcelas</label><input type="number" id="installments" name="installments" min="1" className={inputStyle} placeholder="1" /></div></div><div><label htmlFor="fees" className={labelStyle}>Taxas (R$)</label><input type="number" id="fees" name="fees" step="0.01" className={inputStyle} placeholder="ex: 4,50" /></div></>)}
            <div><label htmlFor="discount" className={labelStyle}>Desconto (R$)</label><input type="number" id="discount" name="discount" step="0.01" className={inputStyle} placeholder="Opcional" /></div>
            <div><label htmlFor="surcharge" className={labelStyle}>Acréscimo (R$)</label><input type="number" id="surcharge" name="surcharge" step="0.01" className={inputStyle} placeholder="Opcional" /></div>
        </>
    );

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b"><div><h2 className="text-xl font-bold text-zinc-800">Financeiro</h2><p className="text-sm text-zinc-500">{student.name}</p></div><button onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100"><XMarkIcon /></button></header>
                <nav className="flex border-b">
                    <button onClick={() => setActiveTab('historico')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'historico' ? 'text-secondary border-b-2 border-secondary' : 'text-zinc-500 hover:bg-zinc-50'}`}>Histórico</button>
                    <button onClick={() => setActiveTab('creditos')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'creditos' ? 'text-secondary border-b-2 border-secondary' : 'text-zinc-500 hover:bg-zinc-50'}`}>Registrar Créditos</button>
                    <button onClick={() => setActiveTab('mensalidade')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'mensalidade' ? 'text-secondary border-b-2 border-secondary' : 'text-zinc-500 hover:bg-zinc-50'}`}>Registrar Mensalidade</button>
                </nav>
                <main className="flex-grow overflow-y-auto">
                    {activeTab === 'historico' && (<div className="divide-y">{transactions.length > 0 ? (transactions.map(tx => <TransactionItem key={tx.id} transaction={tx} type="student" />)) : (<p className="p-6 text-center text-zinc-500">Nenhum histórico financeiro encontrado.</p>)}</div>)}
                    {activeTab === 'creditos' && (<form onSubmit={handleFormSubmit} className="p-6 space-y-4"><div><label htmlFor="credits" className={labelStyle}>Quantidade de Créditos</label><input type="number" id="credits" name="credits" className={inputStyle} placeholder="ex: 10" required /></div>{renderFormContent()}<div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setActiveTab('historico')} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button><button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark">Salvar Compra</button></div></form>)}
                    {activeTab === 'mensalidade' && (<form onSubmit={handleFormSubmit} className="p-6 space-y-4"><div><label htmlFor="month" className={labelStyle}>Mês de Referência</label><select id="month" name="month" className={inputStyle} required>{months.map(m => <option key={m} value={m}>{m}</option>)}</select></div>{renderFormContent()}<div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setActiveTab('historico')} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button><button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark">Salvar Mensalidade</button></div></form>)}
                </main>
            </div>
        </div>
    );
};

export default FinancialModal;
