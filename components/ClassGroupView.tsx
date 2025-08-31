

import React, { useState, useEffect, useContext } from 'react';
import { ClassGroup, Student, Professional } from '../types';
import AddClassGroupForm from './AddClassGroupForm';
import ClassGroupDetail from './ClassGroupDetail';
// FIX: Remove mock data import and add firebase imports
import { db } from '../firebase';
import { collection, onSnapshot, query, doc, addDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeftIcon, PlusIcon, UsersIcon } from './Icons';
import { ToastContext } from '../App';

const pastelColorStyles = [
  { name: 'sky', bg: 'bg-sky-50', border: 'border-sky-200', hoverBorder: 'hover:border-sky-400', text: 'text-sky-800' },
  { name: 'teal', bg: 'bg-teal-50', border: 'border-teal-200', hoverBorder: 'hover:border-teal-400', text: 'text-teal-800' },
  { name: 'rose', bg: 'bg-rose-50', border: 'border-rose-200', hoverBorder: 'hover:border-rose-400', text: 'text-rose-800' },
  { name: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', hoverBorder: 'hover:border-amber-400', text: 'text-amber-800' },
  { name: 'violet', bg: 'bg-violet-50', border: 'border-violet-200', hoverBorder: 'hover:border-violet-400', text: 'text-violet-800' },
  { name: 'lime', bg: 'bg-lime-50', border: 'border-lime-200', hoverBorder: 'hover:border-lime-400', text: 'text-lime-800' },
];

// --- Helper Components ---
const ClassGroupCard: React.FC<{ group: ClassGroup; onClick: () => void; professional?: Professional }> = ({ group, onClick, professional }) => {
    const colorStyle = pastelColorStyles.find(c => c.name === group.color) 
        || { bg: 'bg-white', border: 'border-zinc-200', hoverBorder: 'hover:border-secondary' };

    return (
        <button 
            onClick={onClick} 
            className={`w-full text-left p-4 rounded-lg border hover:shadow-md transition-all ${colorStyle.bg} ${colorStyle.border} ${colorStyle.hoverBorder}`}
        >
            <h4 className="font-bold text-zinc-800">{group.name}</h4>
            <p className="text-sm text-zinc-500">Prof. {professional?.name || 'N/A'}</p>
            <div className="flex items-center gap-2 mt-2">
                <UsersIcon className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-600">{group.studentIds.length} alunos</span>
            </div>
        </button>
    );
};


// --- Main Component ---
interface ClassGroupViewProps {
    onBack: () => void;
}

const ClassGroupView: React.FC<ClassGroupViewProps> = ({ onBack }) => {
    const { showToast } = useContext(ToastContext);
    const [groups, setGroups] = useState<ClassGroup[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);

    const [selectedGroup, setSelectedGroup] = useState<ClassGroup | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState<ClassGroup | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

    useEffect(() => {
        const createErrorHandler = (context: string) => (error: any) => {
            console.error(`Firestore (ClassGroupView - ${context}) Error:`, error);
            if (error.code === 'permission-denied') {
                showToast(`Você não tem permissão para carregar dados de ${context}.`, "error");
            } else if (error.code === 'unavailable') {
                showToast("Erro de conexão. Verifique sua internet.", "error");
            }
        };

        const unsubGroups = onSnapshot(query(collection(db, "classGroups")), snap => setGroups(snap.docs.map(d => ({id: d.id, ...d.data()})) as ClassGroup[]), createErrorHandler("Turmas"));
        const unsubStudents = onSnapshot(query(collection(db, "students")), snap => setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})) as Student[]), createErrorHandler("Alunos"));
        const unsubProfessionals = onSnapshot(query(collection(db, "professionals")), snap => setProfessionals(snap.docs.map(d => ({id: d.id, ...d.data()})) as Professional[]), createErrorHandler("Profissionais"));
        return () => { unsubGroups(); unsubStudents(); unsubProfessionals(); };
    }, [showToast]);

    const handleOpenModal = (group: ClassGroup | null = null) => {
        setGroupToEdit(group);
        setIsModalOpen(true);
    };

    const handleSaveGroup = async (groupData: Omit<ClassGroup, 'id' | 'status'>) => {
        try {
            if (groupToEdit) {
                const groupRef = doc(db, 'classGroups', groupToEdit.id);
                await updateDoc(groupRef, groupData as any);
                showToast('Turma atualizada com sucesso!', 'success');
            } else {
                const newGroup = { status: 'active', ...groupData };
                await addDoc(collection(db, 'classGroups'), newGroup);
                showToast('Turma criada com sucesso!', 'success');
            }
        } catch (error: any) {
            console.error("Error saving class group:", error);
            if (error.code === 'permission-denied') {
                showToast("Você não tem permissão para salvar esta turma.", "error");
            } else {
                showToast("Ocorreu um erro ao salvar a turma.", "error");
            }
        }
    };

    const handleArchiveGroup = async (groupId: string) => {
        try {
            const groupRef = doc(db, 'classGroups', groupId);
            await updateDoc(groupRef, { status: 'archived' });
            showToast('Turma arquivada com sucesso.', 'success');
            setSelectedGroup(null);
        } catch (error: any) {
            console.error("Error archiving group:", error);
            showToast("Ocorreu um erro ao arquivar a turma.", "error");
        }
    };
    
    const handleReactivateGroup = async (groupId: string) => {
        try {
            const groupRef = doc(db, 'classGroups', groupId);
            await updateDoc(groupRef, { status: 'active' });
            showToast('Turma reativada com sucesso.', 'success');
            setSelectedGroup(null);
        } catch (error: any) {
            console.error("Error reactivating group:", error);
            showToast("Ocorreu um erro ao reativar a turma.", "error");
        }
    };

    if (selectedGroup) {
        return <ClassGroupDetail
            group={selectedGroup}
            onBack={() => setSelectedGroup(null)}
            students={students}
            professional={professionals.find(p => p.id === selectedGroup.professionalId)}
            onEdit={() => handleOpenModal(selectedGroup)}
            onArchive={handleArchiveGroup}
            onReactivate={handleReactivateGroup}
        />
    }

    const visibleGroups = groups.filter(g => g.status === activeTab);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-zinc-800">Turmas</h2>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-dark text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                    <PlusIcon />
                    <span>Criar Turma</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b mb-4">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('active')} className={`py-2 px-1 border-b-2 font-semibold text-sm ${activeTab === 'active' ? 'border-secondary text-secondary' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}>
                        Ativas ({groups.filter(g => g.status === 'active').length})
                    </button>
                    <button onClick={() => setActiveTab('archived')} className={`py-2 px-1 border-b-2 font-semibold text-sm ${activeTab === 'archived' ? 'border-secondary text-secondary' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}>
                        Arquivadas ({groups.filter(g => g.status === 'archived').length})
                    </button>
                </nav>
            </div>

            {/* Group List */}
            <div className="flex-grow overflow-y-auto pr-2">
                {visibleGroups.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {visibleGroups.map(group => (
                            <ClassGroupCard
                                key={group.id}
                                group={group}
                                onClick={() => setSelectedGroup(group)}
                                professional={professionals.find(p => p.id === group.professionalId)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-zinc-500">Nenhuma turma encontrada nesta categoria.</p>
                    </div>
                )}
            </div>

            <AddClassGroupForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveGroup}
                groupToEdit={groupToEdit}
                students={students}
                professionals={professionals}
            />
        </div>
    );
};

export default ClassGroupView;
