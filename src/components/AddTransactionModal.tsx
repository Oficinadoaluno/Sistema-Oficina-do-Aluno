import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, Professional, Collaborator } from '../types';
import { XMarkIcon } from './Icons';
import SearchableSelect from './SearchableSelect';

// Props and Styles
interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    incomeCategories: string[];
    expenseCategories: string[];
    students: Student[];
    professionals: Professional[];
    collaborators: Collaborator[];
}
const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";
const CREATE_NEW_CATEGORY = '__CREATE_NEW__';

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onSave, incomeCategories, expenseCategories, students, professionals, collaborators }) => {
    // State
    const [transactionType, setTransactionType] = useState<'recebimento' | 'pagamento'>('pagamento');
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [paidDate, setPaidDate] = useState<string | undefined>(undefined);
    const [sourceType, setSourceType] = useState('outro');
    const [sourceId, setSourceId] = useState('');
    const [sourceText, setSourceText] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [installments, setInstallments] = useState<number | ''>('');
    const [fees, setFees] = useState<number | ''>('');
    const [paymentMethod, setPaymentMethod] = useState('pix');
    const [customPaymentMethod, setCustomPaymentMethod] = useState('');
    const [category, setCategory] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');

    const categories = transactionType === 'recebimento' ? incomeCategories : expenseCategories;

    // Reset state when modal opens/closes or type changes
    useEffect(() => {
        if (isOpen) {
            setDueDate(new Date().toISOString().split('T')[0]);
            setPaidDate(undefined);
            setTransactionType('pagamento');
            setSourceType('outro');
            setSourceId('');
            setSourceText('');
            setDescription('');
            setAmount('');
            setInstallments('');
            setFees('');
            setPaymentMethod('pix');
            setCustomPaymentMethod('');
            setCategory(expenseCategories[0] || CREATE_NEW_CATEGORY);
            setNewCategoryName('');
        }
    }, [isOpen, expenseCategories]);
    
    useEffect(() => {
        setCategory(categories[0] || CREATE_NEW_CATEGORY);
    }, [transactionType, categories]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let sourceDest = '';
        if (sourceType === 'aluno') sourceDest = students.find(s => s.id === sourceId)?.name || 'Aluno';
        else if (sourceType === 'professor') sourceDest = professionals.find(p => p.id === sourceId)?.name || 'Professor';
        else if (sourceType === 'colaborador') sourceDest = collaborators.find(c => c.id === sourceId)?.name || 'Colaborador';
        else sourceDest = sourceText.trim();
        
        const finalCategory = category === CREATE_NEW_CATEGORY ? newCategoryName.trim() : category;
        const finalPaymentMethod = paymentMethod === 'outro' ? customPaymentMethod.trim() : paymentMethod;

        if (!dueDate || !sourceDest || !amount || !finalCategory || !finalPaymentMethod) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        onSave({
            transactionType, dueDate, paidDate, sourceDest, description, amount,
            installments: Number(installments) || undefined,
            fees: Number(fees) || undefined,
            paymentMethod: finalPaymentMethod,
            category: finalCategory,
        });
    };
    
    const sourceOptions = useMemo(() => {
        if (sourceType === 'aluno') return students.map(s => ({ value: s.id, label: s.name }));
        if (sourceType === 'professor') return professionals.map(p => ({ value: p.id, label: p.name }));
        if (sourceType === 'colaborador') return collaborators.map(c => ({ value: c.id, label: c.name }));
        return [];
    }, [sourceType, students, professionals, collaborators]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <form className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-zinc-800">Registrar Transação</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto">
                    {/* Type and Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelStyle}>Tipo de Transação</label>
                            <div className="flex items-center gap-4 p-1 bg-zinc-100 rounded-lg">
                                <button type="button" onClick={() => setTransactionType('pagamento')} className={`flex-1 py-1 rounded-md text-sm font-semibold ${transactionType === 'pagamento' ? 'bg-white shadow' : 'hover:bg-zinc-200'}`}>Pagamento</button>
                                <button type="button" onClick={() => setTransactionType('recebimento')} className={`flex-1 py-1 rounded-md text-sm font-semibold ${transactionType === 'recebimento' ? 'bg-white shadow' : 'hover:bg-zinc-200'}`}>Recebimento</button>
                            </div>
                        </div>
                         <div>
                            <label htmlFor="due-date" className={labelStyle}>Data de Vencimento <span className="text-red-500">*</span></label>
                            <input id="due-date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputStyle} required />
                        </div>
                        <div>
                            <label htmlFor="paid-date" className={labelStyle}>Data de Pagamento</label>
                            <input id="paid-date" type="date" value={paidDate || ''} onChange={e => setPaidDate(e.target.value)} className={inputStyle} />
                            <p className="text-xs text-zinc-500 mt-1">Deixe em branco se pendente.</p>
                        </div>
                    </div>
                    {/* Source */}
                    <div>
                        <label className={labelStyle}>Quem <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-3 gap-4">
                             <select value={sourceType} onChange={e => setSourceType(e.target.value)} className={inputStyle}>
                                <option value="outro">Outro</option>
                                <option value="aluno">Aluno</option>
                                <option value="professor">Professor</option>
                                <option value="colaborador">Colaborador</option>
                            </select>
                            <div className="col-span-2">
                                {sourceType === 'outro' ? (
                                    <input type="text" value={sourceText} onChange={e => setSourceText(e.target.value)} className={inputStyle} placeholder="Digite o nome..." required/>
                                ) : (
                                    <SearchableSelect options={sourceOptions} value={sourceId} onChange={setSourceId} placeholder={`Selecione um ${sourceType}...`}/>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Details */}
                     <div>
                        <label htmlFor="description" className={labelStyle}>Descrição</label>
                        <input id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputStyle} placeholder="Opcional. Ex: Compra de material didático" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="amount" className={labelStyle}>Valor (R$) <span className="text-red-500">*</span></label>
                            <input id="amount" type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} step="0.01" min="0" className={inputStyle} required />
                        </div>
                        <div>
                            <label htmlFor="installments" className={labelStyle}>Parcelas</label>
                            <input id="installments" type="number" value={installments} onChange={e => setInstallments(Number(e.target.value))} min="1" className={inputStyle} placeholder="Opcional"/>
                        </div>
                         <div>
                            <label htmlFor="fees" className={labelStyle}>Taxas (R$)</label>
                            <input id="fees" type="number" value={fees} onChange={e => setFees(Number(e.target.value))} step="0.01" min="0" className={inputStyle} placeholder="Opcional"/>
                        </div>
                    </div>

                     {/* Payment Method and Category */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="paymentMethod" className={labelStyle}>Forma de Pagamento <span className="text-red-500">*</span></label>
                            <select id="paymentMethod" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inputStyle}>
                                <option value="pix">Pix</option>
                                <option value="cartao">Cartão</option>
                                <option value="boleto">Boleto</option>
                                <option value="dinheiro">Dinheiro</option>
                                <option value="transferencia">Transferência</option>
                                <option value="outro">Outro</option>
                            </select>
                        </div>
                        {paymentMethod === 'outro' && (
                            <div className="animate-fade-in-fast">
                                <label htmlFor="customPaymentMethod" className={labelStyle}>Qual forma? <span className="text-red-500">*</span></label>
                                <input id="customPaymentMethod" type="text" value={customPaymentMethod} onChange={e => setCustomPaymentMethod(e.target.value)} className={inputStyle} required/>
                            </div>
                        )}
                        <div>
                            <label htmlFor="category" className={labelStyle}>Categoria <span className="text-red-500">*</span></label>
                            <select id="category" value={category} onChange={e => setCategory(e.target.value)} className={inputStyle}>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                <option value={CREATE_NEW_CATEGORY}>+ Criar nova categoria...</option>
                            </select>
                        </div>
                        {category === CREATE_NEW_CATEGORY && (
                            <div className="animate-fade-in-fast">
                                <label htmlFor="new-category" className={labelStyle}>Nome da Nova Categoria <span className="text-red-500">*</span></label>
                                <input id="new-category" type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className={inputStyle} required />
                            </div>
                        )}
                    </div>
                </main>
                <footer className="flex justify-end items-center gap-4 p-4 border-t bg-zinc-50 rounded-b-xl">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-200 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-300 transition-colors">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors transform hover:scale-105">Salvar</button>
                </footer>
            </form>
            <style>{`.animate-fade-in-fast { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </div>
    );
};

export default AddTransactionModal;