import React, { useState, useMemo, useEffect, useContext } from 'react';
import AddProfessionalForm from './AddProfessionalForm';
import ProfessionalDetail from './ProfessionalDetail';
import AddCollaboratorForm from './AddCollaboratorForm';
import { Professional, Collaborator } from '../types';
import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { ArrowLeftIcon, MagnifyingGlassIcon, PlusIcon, UserIcon, UserGroupIcon } from './Icons';
import { ToastContext } from '../App';
import { getShortName } from '../utils/sanitizeFirestore';

interface TeamManagementProps {
    onBack: () => void;
    currentUser: Collaborator;
}

const TabButton: React.FC<{
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, icon: Icon, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-2 py-2 px-3 border-b-2 font-semibold text-sm transition-colors ${isActive ? 'border-secondary text-secondary' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}>
        <Icon className="h-5 w-5" />
        <span>{label}</span>
    </button>
);

const ProfessionalList: React.FC<TeamManagementProps> = ({ onBack: onBackToDashboard, currentUser }) => {
    const { showToast } = useContext(ToastContext);

    // --- State Management ---
    const [activeTab, setActiveTab] = useState<'professionals' | 'collaborators'>('professionals');
    const [loading, setLoading] = useState(true);

    // Professionals State
    const [profView, setProfView] = useState<'list' | 'add' | 'detail' | 'edit'>('list');
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
    const [profSearchTerm, setProfSearchTerm] = useState('');
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [selectedProfStatus, setSelectedProfStatus] = useState<'ativo' | 'inativo' | ''>('ativo');

    // Collaborators State
    const [collabView, setCollabView] = useState<'list' | 'add' | 'edit'>('list');
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [collaboratorToEdit, setCollaboratorToEdit] = useState<Collaborator | null>(null);

    // --- Permissions ---
    const canManageUsers = currentUser.role?.toLowerCase().includes('diretor');

    // --- Data Fetching ---
    useEffect(() => {
        setLoading(true);
        const unsubProfs = db.collection("professionals").orderBy("name").onSnapshot(snap => {
            setProfessionals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Professional[]);
            setLoading(false);
        }, err => {
            console.error(err);
            showToast("Erro ao buscar professores.", "error");
            setLoading(false);
        });

        const unsubCollabs = db.collection("collaborators").orderBy("name").onSnapshot(snap => {
            setCollaborators(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Collaborator[]);
        }, err => {
            console.error(err);
            showToast("Erro ao buscar colaboradores.", "error");
        });
        
        return () => {
            unsubProfs();
            unsubCollabs();
        };
    }, [showToast]);

    // --- Memoized Filters ---
    const allDisciplines = useMemo(() => [...new Set(professionals.flatMap(p => p.disciplines))].sort(), [professionals]);
    const filteredProfessionals = useMemo(() => professionals.filter(prof => {
        const matchesSearch = profSearchTerm === '' || prof.name.toLowerCase().includes(profSearchTerm.toLowerCase());
        const matchesDiscipline = selectedDiscipline === '' || prof.disciplines.includes(selectedDiscipline);
        const matchesStatus = selectedProfStatus === '' || prof.status === selectedProfStatus;
        return matchesSearch && matchesDiscipline && matchesStatus;
    }), [professionals, profSearchTerm, selectedDiscipline, selectedProfStatus]);

    // --- Handlers for Professionals ---
    const handleViewProfDetails = (prof: Professional) => {
        setSelectedProfessional(prof);
        setProfView('detail');
    };
    const handleBackToProfList = () => {
        if (profView === 'edit') setProfView('detail');
        else { setSelectedProfessional(null); setProfView('list'); }
    };

    // --- Handlers for Collaborators ---
    const handleSaveCollaborator = async (collaboratorData: Omit<Collaborator, 'id'>, password?: string) => {
        try {
            if (collabView === 'edit' && collaboratorToEdit) {
                const collaboratorRef = db.collection("collaborators").doc(collaboratorToEdit.id);
                await collaboratorRef.update(collaboratorData as any);
                showToast('Colaborador atualizado com sucesso!', 'success');
            } else {
                if (!password) throw new Error("A senha é obrigatória para um novo colaborador.");
                const creationAppName = `user-creation-${Date.now()}`;
                const tempApp = firebase.initializeApp(firebase.app().options, creationAppName);
                const tempAuth = tempApp.auth();
                try {
                    const emailForAuth = collaboratorData.login.includes('@') ? collaboratorData.login : `${collaboratorData.login}@sistema-oficinadoaluno.com`;
                    const userCredential = await tempAuth.createUserWithEmailAndPassword(emailForAuth, password);
                    await db.collection("collaborators").doc(userCredential.user!.uid).set(collaboratorData);
                    showToast('Colaborador criado com sucesso!', 'success');
                } finally {
                    await tempAuth.signOut();
                    await tempApp.delete();
                }
            }
            setCollabView('list');
            setCollaboratorToEdit(null);
        } catch (error: any) {
            console.error("Error saving collaborator:", error);
            if (error.code === 'auth/email-already-in-use') showToast('Erro: O login (email) já está em uso.', 'error');
            else showToast("Ocorreu um erro ao salvar o colaborador.", 'error');
        }
    };

    const handleEditCollaborator = (collaborator: Collaborator) => {
        setCollaboratorToEdit(collaborator);
        setCollabView('edit');
    };

    // --- Sub-View Rendering ---
    if (activeTab === 'professionals') {
        if (profView === 'add') return <AddProfessionalForm onBack={() => setProfView('list')} />;
        if (profView === 'edit' && selectedProfessional) return <AddProfessionalForm onBack={handleBackToProfList} professionalToEdit={selectedProfessional} />;
        if (profView === 'detail' && selectedProfessional) return <ProfessionalDetail professional={selectedProfessional} onBack={handleBackToProfList} onEdit={() => setProfView('edit')} />;
    }
    if (activeTab === 'collaborators' && canManageUsers) {
        if (collabView === 'add' || collabView === 'edit') {
            return <AddCollaboratorForm onBack={() => setCollabView('list')} onSave={handleSaveCollaborator} collaboratorToEdit={collaboratorToEdit} />;
        }
    }

    // --- Main List View Rendering ---
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <header className="flex items-center gap-4 mb-4">
                <button onClick={onBackToDashboard} className="text-zinc-500 hover:text-zinc-800 transition-colors"><ArrowLeftIcon className="h-6 w-6" /></button>
                <h2 className="text-2xl font-bold text-zinc-800">Gestão de Equipe</h2>
            </header>

            <div className="border-b">
                <nav className="-mb-px flex space-x-6">
                    <TabButton label="Professores" icon={UserIcon} isActive={activeTab === 'professionals'} onClick={() => setActiveTab('professionals')} />
                    {canManageUsers && <TabButton label="Usuários do Sistema" icon={UserGroupIcon} isActive={activeTab === 'collaborators'} onClick={() => setActiveTab('collaborators')} />}
                </nav>
            </div>

            {/* Professionals Tab Content */}
            {activeTab === 'professionals' && (
                <div className="flex-grow flex flex-col pt-4 min-h-0">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <h3 className="text-xl font-semibold text-zinc-700">Professores<span className="text-lg font-normal text-zinc-500 ml-2">({filteredProfessionals.length} encontrados)</span></h3>
                        <button onClick={() => setProfView('add')} className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-dark text-white font-semibold py-2 px-4 rounded-lg"><PlusIcon className="h-5 w-5" /><span>Novo Professor</span></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="relative md:col-span-2"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" /></div><input type="text" placeholder="Buscar por nome..." value={profSearchTerm} onChange={(e) => setProfSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" /></div>
                        <select value={selectedProfStatus} onChange={(e) => setSelectedProfStatus(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg bg-white"><option value="ativo">Ativos</option><option value="inativo">Inativos</option><option value="">Todos</option></select>
                        <select value={selectedDiscipline} onChange={(e) => setSelectedDiscipline(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-white"><option value="">Todas as Disciplinas</option>{allDisciplines.map(d => <option key={d} value={d}>{d}</option>)}</select>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {loading ? <div className="text-center py-10">Carregando...</div> :
                         <>
                            {/* Desktop Table */}
                            <div className="hidden md:block">
                                <table className="min-w-full divide-y divide-zinc-200"><thead className="bg-zinc-50 sticky top-0"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Nome</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Disciplinas</th><th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th></tr></thead><tbody className="bg-white divide-y divide-zinc-200">{filteredProfessionals.map((prof) => (<tr key={prof.id} className="hover:bg-zinc-50"><td className="px-6 py-4"><div className="text-sm font-medium text-zinc-900" title={prof.name}>{getShortName(prof.name)}</div></td><td className="px-6 py-4"><div className="flex flex-wrap gap-1">{prof.disciplines.map(d => (<span key={d} className="px-2 inline-flex text-xs font-semibold rounded-full bg-secondary/10 text-secondary-dark">{d}</span>))}</div></td><td className="px-6 py-4 text-right text-sm"><button onClick={() => handleViewProfDetails(prof)} className="text-secondary hover:text-secondary-dark font-semibold">Ver mais</button></td></tr>))}</tbody></table>
                            </div>
                            {/* Mobile Cards */}
                            <div className="space-y-3 md:hidden">
                                {filteredProfessionals.map(prof => (
                                     <div key={prof.id} className="bg-zinc-50 border rounded-lg p-4">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-zinc-900" title={prof.name}>{getShortName(prof.name)}</p>
                                            <button onClick={() => handleViewProfDetails(prof)} className="text-secondary hover:text-secondary-dark font-semibold text-sm">Ver mais</button>
                                        </div>
                                        <div className="mt-2 pt-2 border-t flex flex-wrap gap-1">
                                            {prof.disciplines.map(d => (<span key={d} className="px-2 inline-flex text-xs font-semibold rounded-full bg-secondary/10 text-secondary-dark">{d}</span>))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                         </>
                        }
                    </div>
                </div>
            )}

            {/* Collaborators Tab Content */}
            {activeTab === 'collaborators' && canManageUsers && (
                <div className="flex-grow flex flex-col pt-4 min-h-0">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-zinc-700">Gerenciar Usuários do Sistema</h3>
                        <button onClick={() => { setCollabView('add'); setCollaboratorToEdit(null); }} className="flex items-center gap-2 bg-secondary text-white font-semibold py-2 px-3 rounded-lg hover:bg-secondary-dark"><PlusIcon className="h-5 w-5"/> Novo Colaborador</button>
                    </div>
                    <div className="flex-grow overflow-y-auto border rounded-lg">{loading ? <div className="text-center py-10">Carregando...</div> : <table className="min-w-full divide-y divide-zinc-200"><thead className="bg-zinc-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Nome</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Função</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Login</th><th className="relative px-4 py-2"><span className="sr-only">Ações</span></th></tr></thead><tbody className="bg-white divide-y divide-zinc-200">{collaborators.map(c => (<tr key={c.id}><td className="px-4 py-3 text-sm font-medium text-zinc-800">{c.name}</td><td className="px-4 py-3 text-sm text-zinc-600">{c.role}</td><td className="px-4 py-3 text-sm text-zinc-600">{c.login}</td><td className="px-4 py-3 text-right text-sm"><button onClick={() => handleEditCollaborator(c)} className="font-semibold text-secondary hover:text-secondary-dark">Editar</button></td></tr>))}</tbody></table>}</div>
                </div>
            )}
        </div>
    );
};

export default ProfessionalList;