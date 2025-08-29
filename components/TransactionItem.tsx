import React, { useState, useEffect } from 'react';
import { Transaction, PaymentMethod, Collaborator } from '../types';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ChevronDownIcon } from './Icons';

interface TransactionItemProps {
    transaction: Transaction;
    type: 'student' | 'professional';
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, type }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [collaboratorName, setCollaboratorName] = useState('Sistema');

    useEffect(() => {
        const fetchCollaborator = async () => {
            if (transaction.registeredById) {
                const docRef = doc(db, "collaborators", transaction.registeredById);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setCollaboratorName((docSnap.data() as Collaborator).name);
                }
            }
        };
        fetchCollaborator();
    }, [transaction.registeredById]);

    const paymentMethodText: Record<string, string> = {
        pix: 'Pix',
        cartao: 'Cartão',
        dinheiro: 'Dinheiro',
        outro: 'Outro'
    };
    
    const getTitle = () => {
        if (type === 'professional') return `Pagamento - ${transaction.month}`;
        return transaction.type === 'credit' ? `+${transaction.credits} Créditos` : `Mensalidade - ${transaction.month}`;
    };

    return (
        <div className="border-b">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left hover:bg-zinc-50">
                <div>
                    <p className="font-semibold text-zinc-800">{getTitle()}</p>
                    <p className="text-sm text-zinc-500">{new Date(transaction.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="font-bold text-lg text-zinc-700">R$ {transaction.amount.toFixed(2).replace('.', ',')}</span>
                    <ChevronDownIcon open={isOpen} className="h-5 w-5" />
                </div>
            </button>
            {isOpen && (
                <div className="p-4 bg-zinc-50 text-sm text-zinc-600 space-y-2 animate-fade-in-fast">
                    <p><strong>Forma de Pagamento:</strong> {paymentMethodText[transaction.paymentMethod] || transaction.paymentMethod}</p>
                    {type === 'student' && transaction.paymentMethod === 'cartao' && transaction.cardDetails && (
                        <>
                            <p><strong>Método do Cartão:</strong> {transaction.cardDetails.method}</p>
                            {transaction.cardDetails.installments && <p><strong>Parcelas:</strong> {transaction.cardDetails.installments}x</p>}
                            {transaction.cardDetails.fees && <p><strong>Taxas:</strong> R$ {transaction.cardDetails.fees.toFixed(2).replace('.', ',')}</p>}
                        </>
                    )}
                    {type === 'student' && transaction.discount && <p><strong>Desconto:</strong> R$ {transaction.discount.toFixed(2).replace('.', ',')}</p>}
                    {type === 'student' && transaction.surcharge && <p><strong>Acréscimo:</strong> R$ {transaction.surcharge.toFixed(2).replace('.', ',')}</p>}
                    <p><strong>Registrado por:</strong> {collaboratorName}</p>
                </div>
            )}
        </div>
    );
};

export default TransactionItem;
