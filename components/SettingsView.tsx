
import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Collaborator, Student, Professional } from '../types';
import AddCollaboratorForm from './AddCollaboratorForm';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, doc, addDoc, updateDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ArrowLeftIcon, PlusIcon, UserGroupIcon, FunnelIcon, ChartPieIcon, PhoneIcon, CheckCircleIcon } from './Icons';
import { ToastContext } from '../App';

// --- Reusable Components ---

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

const MetricCard: React.FC<{ title: string; value: string | number; subtext?: string }> = ({ title, value, subtext }) => (
    <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
        <p className="text-sm font-medium text-zinc-500">{title}</p>
        <p className="text-3xl font-bold text-zinc-800">{value}</p>
        {subtext && <p className="text-xs text-zinc-500 mt-1">{subtext}</p>}
    </div>
);


// --- View Components for Tabs ---

const CollaboratorsView: React.FC<{ collaborators: Collaborator[]; onEdit: (c: Collaborator) => void }> = ({ collaborators, onEdit }) => {
    const getAccessText = (collaborator: Collaborator) => {
        const panels = collaborator.systemAccess.map(panel => {
            if (panel === 'admin') return 'Painel Administrativo';
            if (panel === 'teacher') return 'Painel do Professor';
            if (panel === 'student') return 'Painel do Aluno';
            return '';
        }).join(', ');
        return panels;
    };
    
    const getRemunerationText = (collaborator: Collaborator) => {
        if (collaborator.remunerationType === 'fixed') {
            return `Fixo: ${collaborator.fixedSalary?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'N/A'}`;
        }
        if (collaborator.remunerationType === 'commission') {
            return `Comissão: ${collaborator.commissionPercentage || 0}%`;
        }
        return 'Não definido';
    };

    return (
        <div className="animate-fade-in-fast">
            <h3 className="text-lg font-semibold text-zinc-700 mb-2">Gerenciar Colaboradores</h3>
            <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-zinc-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Nome</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Função</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Remuneração</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Acesso</th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Ações</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-200">
                        {collaborators.map((collab) => (
                            <tr key={collab.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-zinc-900">{collab.name}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-zinc-600">{collab.role}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-zinc-600">{getRemunerationText(collab)}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-secondary/10 text-secondary-dark">{getAccessText(collab)}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => onEdit(collab)} className="text-secondary hover:text-secondary-dark font-semibold">Editar</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ProspectsView: React.FC<{students: Student[]}> = ({ students }) => {
    const { showToast } = useContext(ToastContext);
    const prospects = useMemo(() => students.filter(s => s.status === 'prospeccao'), [students]);
    
    const handleConvert = async (student: Student) => {
        if(window.confirm(`Tem certeza que deseja converter ${student.name} para matrícula?`)) {
            try {
                const studentRef = doc(db, 'students', student.id);
                await updateDoc(studentRef, { status: 'matricula' });
                showToast(`${student.name} convertido para matrícula com sucesso!`, 'success');
            } catch (error: any) {
                console.error("Error converting prospect:", error);
                if (error.code === 'permission-denied') {
                    showToast("Você não tem permissão para alterar o status do aluno.", "error");
                } else {
                    showToast("Ocorreu um erro ao converter o aluno.", "error");
                }
            }
        }
    };

    return (
        <div className="animate-fade-in-fast">
            <h3 className="text-lg font-semibold text-zinc-700 mb-2">Acompanhamento de Prospecções</h3>
            <p className="text-sm text-zinc-600 mb-4">
                Acompanhe e gerencie os alunos em potencial. Registre contatos, agende avaliações e converta prospecções em matrículas.
            </p>
             <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-zinc-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Aluno</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Responsável</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Contato</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Principal Objetivo</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-200">
                        {prospects.map(student => (
                            <tr key={student.id} className="hover:bg-zinc-50">
                                <td className="px-6 py-4 font-medium text-zinc-900">{student.name}</td>
                                <td className="px-6 py-4 text-zinc-600">{student.guardian}</td>
                                <td className="px-6 py-4 text-zinc-600 flex items-center gap-2">
                                    <PhoneIcon className="h-4 w-4 text-zinc-400"/>
                                    {student.guardianMobile || student.guardianPhone || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-zinc-600">{student.objective || 'Não informado'}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleConvert(student)} className="flex items-center gap-1 text-sm bg-green-100 hover:bg-green-200 text-green-800 font-semibold py-1 px-3 rounded-full transition-colors">
                                        <CheckCircleIcon className="h-4 w-4"/>
                                        Converter
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {prospects.length === 0 && <p className="text-center py-8 text-zinc-500">Nenhum aluno em prospecção no momento.</p>}
            </div>
        </div>
    );
};

const MetricsView: React.FC<{ students: Student[], professionals: Professional[] }> = ({ students, professionals }) => {
    const activeStudents = useMemo(() => students.filter(s => s.status === 'matricula').length, [students]);
    const prospects = useMemo(() => students.filter(s => s.status === 'prospeccao').length, [students]);
    const activeProfessionals = useMemo(() => professionals.filter(p => p.status === 'ativo').length, [professionals]);
    
    return (
        <div className="animate-fade-in-fast">
            <h3 className="text-lg font-semibold text-zinc-700 mb-2">Métricas e Relatórios</h3>
            <p className="text-sm text-zinc-600 mb-4">
                Analise o desempenho da sua operação com dados sobre alunos, finanças e crescimento.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Alunos Ativos" value={activeStudents} />
                <MetricCard title="Prospecções" value={prospects} />
                <MetricCard title="Profissionais Ativos" value={activeProfessionals} />
                <MetricCard title="Taxa de Conversão" value="75%" subtext="Últimos 30 dias (simulado)" />
            </div>

            <div className="mt-6 p-8 bg-zinc-50 rounded-lg text-center border">
                <h4 className="text-lg font-semibold text-zinc-700">Gráficos Detalhados</h4>
                <p className="text-zinc-500 mt-2">Gráficos de faturamento, crescimento de alunos e outras métricas avançadas estarão disponíveis aqui em breve.</p>
            </div>
        </div>
    );
};


// --- Main Settings Component ---
interface SettingsViewProps {
    onBack: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
    const { showToast } = useContext(ToastContext);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [collaboratorToEdit, setCollaboratorToEdit] = useState<Collaborator | null>(null);
    const [activeTab, setActiveTab] = useState<'collaborators' | 'prospects' | 'metrics'>('collaborators');

    useEffect(() => {
        const createErrorHandler = (context: string) => (error: any) => {
            console.error(`Firestore (SettingsView - ${context}) Error:`, error);
            if (error.code === 'permission-denied') {
                showToast(`Você não tem permissão para carregar dados de ${context}.`, "error");
            }
        };
        const unsubCollaborators = onSnapshot(query(collection(db, "collaborators")), snap => setCollaborators(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Collaborator[]), createErrorHandler("Colaboradores"));
        const unsubStudents = onSnapshot(query(collection(db, "students")), snap => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Student[]), createErrorHandler("Alunos"));
        const unsubProfessionals = onSnapshot(query(collection(db, "professionals")), snap => setProfessionals(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Professional[]), createErrorHandler("Profissionais"));
        return () => { unsubCollaborators(); unsubStudents(); unsubProfessionals(); };
    }, [showToast]);

    const handleOpenForm = (collaborator: Collaborator | null = null) => {
        setCollaboratorToEdit(collaborator);
        setView('form');
    };

    const handleSaveCollaborator = async (data: Omit<Collaborator, 'id'>, password?: string) => {
        if (collaboratorToEdit) { // Editing existing collaborator
            try {
                const { login, ...updateData } = data; // FIX: Do not include login in the update payload
                const collabRef = doc(db, "collaborators", collaboratorToEdit.id);
                await updateDoc(collabRef, updateData as any);
                if (password) {
                    showToast("Senha de outros usuários não pode ser alterada aqui.", 'info');
                }
                showToast("Dados do colaborador atualizados com sucesso!", 'success');
                setView('list');
                setCollaboratorToEdit(null);
            } catch (error: any) {
                console.error("Error updating collaborator:", error);
                if (error.code === 'permission-denied') {
                    showToast("Você não tem permissão para atualizar colaboradores.", "error");
                } else {
                    showToast("Ocorreu um erro ao atualizar o colaborador.", 'error');
                }
                throw error;
            }
        } else { // Creating new collaborator
            if (!password || password.length < 6) {
                showToast("Forneça uma senha temporária com no mínimo 6 caracteres.", 'error');
                throw new Error("Weak password");
            }
            try {
                const email = data.login.includes('@') ? data.login : `${data.login}@sistema-oficinadoaluno.com`;
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const uid = userCredential.user.uid;
                await setDoc(doc(db, "collaborators", uid), data);
                showToast("Colaborador criado com sucesso!", 'success');
                setView('list');
                setCollaboratorToEdit(null);
            } catch (error: any) {
                console.error("Error creating collaborator:", error);
                if (error.code === 'auth/email-already-in-use') {
                    showToast('Erro: O login (email) já está em uso.', 'error');
                } else if (error.code === 'auth/weak-password') {
                    showToast('Erro: A senha é muito fraca. Use pelo menos 6 caracteres.', 'error');
                } else if (error.code === 'permission-denied') {
                     showToast('Você não tem permissão para criar novos colaboradores.', 'error');
                } else {
                    showToast("Ocorreu um erro ao criar o colaborador.", 'error');
                }
                throw error;
            }
        }
    };

    const handleBackToList = () => {
        setView('list');
        setCollaboratorToEdit(null);
    }

    if (view === 'form') {
        return (
            <AddCollaboratorForm
                onBack={handleBackToList}
                onSave={handleSaveCollaborator}
                collaboratorToEdit={collaboratorToEdit}
            />
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            {/* Header */}
            <header className="flex items-center justify-between mb-4 flex-wrap gap-2">
                 <div className="flex items-center gap-4">
                     <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-zinc-800">
                        Configurações
                    </h2>
                </div>
                 {activeTab === 'collaborators' && (
                    <button onClick={() => handleOpenForm()} className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-dark text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                        <PlusIcon className="h-5 w-5" />
                        <span>Novo Colaborador</span>
                    </button>
                )}
            </header>
            
            {/* Tabs */}
            <div className="border-b">
                 <nav className="-mb-px flex space-x-6">
                    <TabButton label="Colaboradores" icon={UserGroupIcon} isActive={activeTab === 'collaborators'} onClick={() => setActiveTab('collaborators')} />
                    <TabButton label="Prospecções" icon={FunnelIcon} isActive={activeTab === 'prospects'} onClick={() => setActiveTab('prospects')} />
                    <TabButton label="Métricas" icon={ChartPieIcon} isActive={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} />
                </nav>
            </div>

            {/* Content */}
            <main className="flex-grow overflow-y-auto pt-4">
                {activeTab === 'collaborators' && <CollaboratorsView collaborators={collaborators} onEdit={handleOpenForm} />}
                {activeTab === 'prospects' && <ProspectsView students={students} />}
                {activeTab === 'metrics' && <MetricsView students={students} professionals={professionals} />}
            </main>

             <style>{`.animate-fade-in-fast { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </div>
    );
};

export default SettingsView;
