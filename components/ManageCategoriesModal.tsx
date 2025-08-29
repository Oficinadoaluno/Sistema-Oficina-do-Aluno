import React, { useState } from 'react';
import { XMarkIcon, PencilIcon, TrashIcon, CheckIcon } from './Icons';

// Props and Styles
interface ManageCategoriesModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: {
        income: string[];
        expenses: string[];
    };
    onUpdate: (type: 'income' | 'expenses', oldName: string, newName: string) => void;
    onDelete: (type: 'income' | 'expenses', name: string) => void;
    onCreate: (type: 'income' | 'expenses', name: string) => void;
}
const inputStyle = "w-full px-3 py-1 bg-white border border-secondary rounded-md focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";

const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({ isOpen, onClose, categories, onUpdate, onDelete, onCreate }) => {
    const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');
    const [editingCategory, setEditingCategory] = useState<{ oldName: string; newName: string } | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    
    const currentCategories = activeTab === 'expenses' ? categories.expenses : categories.income;

    const handleEditClick = (name: string) => {
        setEditingCategory({ oldName: name, newName: name });
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
    };

    const handleSaveEdit = () => {
        if (editingCategory) {
            onUpdate(activeTab, editingCategory.oldName, editingCategory.newName.trim());
            setEditingCategory(null);
        }
    };
    
    const handleDeleteClick = (name: string) => {
        if (window.confirm(`Tem certeza que deseja excluir a categoria "${name}"? Esta ação não pode ser desfeita.`)) {
            onDelete(activeTab, name);
        }
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newCategoryName.trim();
        if (!trimmedName) {
            alert('O nome da categoria não pode estar em branco.');
            return;
        }
        if (currentCategories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
            alert(`A categoria "${trimmedName}" já existe.`);
            return;
        }
        onCreate(activeTab, trimmedName);
        setNewCategoryName('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-zinc-800">Gerenciar Categorias</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                 <div className="border-b">
                    <nav className="-mb-px flex space-x-6 px-4">
                        <button onClick={() => setActiveTab('expenses')} className={`py-2 px-1 border-b-2 font-semibold text-sm ${activeTab === 'expenses' ? 'border-secondary text-secondary' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}>
                            Despesas
                        </button>
                        <button onClick={() => setActiveTab('income')} className={`py-2 px-1 border-b-2 font-semibold text-sm ${activeTab === 'income' ? 'border-secondary text-secondary' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}>
                            Recebimentos
                        </button>
                    </nav>
                </div>
                <main className="p-4 flex-grow overflow-y-auto">
                    <form onSubmit={handleCreate} className="flex items-center gap-2 mb-4">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder={`Nova categoria de ${activeTab === 'expenses' ? 'despesa' : 'recebimento'}`}
                            className={inputStyle + " flex-grow"}
                        />
                        <button
                            type="submit"
                            className="py-1 px-4 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark transition-colors"
                        >
                            Criar
                        </button>
                    </form>
                    <div className="border-t mb-4"></div>

                    {currentCategories.length === 0 ? (
                        <p className="text-zinc-500 text-center py-8">Nenhuma categoria encontrada.</p>
                    ) : (
                        <ul className="space-y-2">
                            {currentCategories.map(cat => (
                                <li key={cat} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 group">
                                    {editingCategory?.oldName === cat ? (
                                        <div className="flex-grow flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editingCategory.newName}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, newName: e.target.value })}
                                                className={inputStyle}
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                            />
                                            <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-100 rounded-full"><CheckIcon /></button>
                                            <button onClick={handleCancelEdit} className="p-1 text-zinc-500 hover:bg-zinc-100 rounded-full"><XMarkIcon className="h-5 w-5" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-zinc-700">{cat}</span>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditClick(cat)} className="p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-secondary rounded-md" title="Editar"><PencilIcon /></button>
                                                <button onClick={() => handleDeleteClick(cat)} className="p-1.5 text-zinc-500 hover:bg-red-100 hover:text-red-600 rounded-md" title="Excluir"><TrashIcon /></button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </main>
                <footer className="p-4 border-t bg-zinc-50 rounded-b-xl text-right">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-200 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-300 transition-colors">Fechar</button>
                </footer>
            </div>
             <style>{`.animate-fade-in-fast { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </div>
    );
};

export default ManageCategoriesModal;
