import React, { useState, useMemo, useEffect } from 'react';
import AddProfessionalForm from './AddProfessionalForm';
import ProfessionalDetail from './ProfessionalDetail';
import { Professional } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ArrowLeftIcon, MagnifyingGlassIcon, PlusIcon } from './Icons';

interface ProfessionalListProps {
    onBack: () => void;
}

const ProfessionalList: React.FC<ProfessionalListProps> = ({ onBack: onBackToDashboard }) => {
    const [view, setView] = useState<'list' | 'add' | 'detail' | 'edit'>('list');
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'ativo' | 'inativo' | ''>('ativo');

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "professionals"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const profsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Professional[];
            setProfessionals(profsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const allDisciplines = useMemo(() => [...new Set(professionals.flatMap(p => p.disciplines))].sort(), [professionals]);

    const filteredProfessionals = useMemo(() => professionals.filter(prof => {
        const matchesSearch = searchTerm === '' || prof.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDiscipline = selectedDiscipline === '' || prof.disciplines.includes(selectedDiscipline);
        const matchesStatus = selectedStatus === '' || prof.status === selectedStatus;
        return matchesSearch && matchesDiscipline && matchesStatus;
    }), [professionals, searchTerm, selectedDiscipline, selectedStatus]);
    
    const handleViewDetails = (prof: Professional) => {
        setSelectedProfessional(prof);
        setView('detail');
    };
    
    const handleBackToList = () => {
        if (view === 'edit') setView('detail');
        else { setSelectedProfessional(null); setView('list'); }
    };
    
    if (view === 'add') return <AddProfessionalForm onBack={() => setView('list')} />;
    if (view === 'edit' && selectedProfessional) return <AddProfessionalForm onBack={handleBackToList} professionalToEdit={selectedProfessional} />;
    if (view === 'detail' && selectedProfessional) return <ProfessionalDetail professional={selectedProfessional} onBack={handleBackToList} onEdit={() => setView('edit')} />;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                 <div className="flex items-center gap-4">
                     <button onClick={onBackToDashboard} className="text-zinc-500 hover:text-zinc-800 transition-colors"><ArrowLeftIcon className="h-6 w-6" /></button>
                    <h2 className="text-2xl font-bold text-zinc-800">Profissionais<span className="text-lg font-normal text-zinc-500 ml-2">({filteredProfessionals.length} encontrados)</span></h2>
                </div>
                <button onClick={() => setView('add')} className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-dark text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"><PlusIcon className="h-5 w-5" /><span>Novo Profissional</span></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="relative md:col-span-2">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" /></div>
                    <input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow" />
                </div>
                 <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow bg-white"><option value="ativo">Ativos</option><option value="inativo">Inativos</option><option value="">Todos</option></select>
                 <select value={selectedDiscipline} onChange={(e) => setSelectedDiscipline(e.target.value)} className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow bg-white"><option value="">Todas as Disciplinas</option>{allDisciplines.map(d => <option key={d} value={d}>{d}</option>)}</select>
            </div>

            <div className="flex-grow overflow-y-auto">
                {loading ? <div className="text-center py-10">Carregando...</div> : 
                <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-zinc-50 sticky top-0"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Nome</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Disciplinas</th><th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th></tr></thead>
                    <tbody className="bg-white divide-y divide-zinc-200">{filteredProfessionals.map((prof) => (<tr key={prof.id} className="hover:bg-zinc-50 transition-colors"><td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-zinc-900">{prof.name}</div></td><td className="px-6 py-4 whitespace-nowrap"><div className="flex flex-wrap gap-1">{prof.disciplines.map(d => (<span key={d} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-secondary/10 text-secondary-dark">{d}</span>))}</div></td><td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleViewDetails(prof)} className="text-secondary hover:text-secondary-dark font-semibold">Ver mais</button></td></tr>))}</tbody>
                </table>}
                 {!loading && filteredProfessionals.length === 0 && (<div className="text-center py-10"><p className="text-zinc-500">Nenhum profissional encontrado.</p></div>)}
            </div>
        </div>
    );
};

export default ProfessionalList;
