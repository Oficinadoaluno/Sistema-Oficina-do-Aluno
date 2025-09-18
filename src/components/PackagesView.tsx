import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { Student, LessonPackage, ScheduledClass, Collaborator } from '../types';
import { db } from '../firebase';
import { ToastContext } from '../App';
import { ArrowLeftIcon, PlusIcon, XMarkIcon } from './Icons';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

// --- Modals ---

const RegisterPackageModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (pkg: Omit<LessonPackage, 'id'>) => void;
    students: Student[];
    currentUser: Collaborator;
}> = ({ isOpen, onClose, onSave, students, currentUser }) => {
    const [studentId, setStudentId] = useState('');
    const [totalLessons, setTotalLessons] = useState<number | ''>('');
    const [studentSearch, setStudentSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredStudents = useMemo(() => {
        const activeStudents = students.filter(s => s.status === 'matricula');
        if (!studentSearch) return activeStudents;
        return activeStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()));
    }, [studentSearch, students]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentId || !totalLessons || totalLessons <= 0) {
            alert('Por favor, selecione um aluno e insira um número válido de aulas.');
            return;
        }
        onSave({
            studentId,
            totalLessons: Number(totalLessons),
            usedLessons: 0,
            purchaseDate: new Date().toISOString().split('T')[0],
            registeredById: currentUser.id,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <form className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-zinc-800">Registrar Novo Pacote</h3>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-zinc-100"><XMarkIcon className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4">
                    <div className="relative" ref={dropdownRef}>
                        <label htmlFor="student-search" className={labelStyle}>Aluno</label>
                        <input id="student-search" type="text" className={inputStyle} value={studentId ? students.find(s => s.id === studentId)?.name || '' : studentSearch} onChange={(e) => { setStudentSearch(e.target.value); setStudentId(''); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} placeholder="Pesquisar aluno..." required />
                        {isDropdownOpen && (
                            <ul className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">{filteredStudents.map(s => (<li key={s.id} className="px-3 py-2 cursor-pointer hover:bg-zinc-100" onMouseDown={() => { setStudentId(s.id); setStudentSearch(''); setIsDropdownOpen(false); }}>{s.name}</li>))}</ul>
                        )}
                    </div>
                    <div>
                        <label htmlFor="total-lessons" className={labelStyle}>Quantidade de Aulas</label>
                        <input id="total-lessons" type="number" value={totalLessons} onChange={e => setTotalLessons(Number(e.target.value))} className={inputStyle} min="1" required />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 rounded-lg">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark">Salvar</button>
                </div>
            </form>
        </div>
    );
};

// --- Detail View ---

const PackageDetail: React.FC<{
    pkg: LessonPackage;
    student?: Student;
    onBack: () => void;
}> = ({ pkg, student, onBack }) => {
    const [usedClasses, setUsedClasses] = useState<ScheduledClass[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClasses = async () => {
            setLoading(true);
            try {
                const q = db.collection('scheduledClasses').where('packageId', '==', pkg.id).orderBy('date', 'desc');
                const snap = await q.get();
                setUsedClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ScheduledClass[]);
            } catch (error) {
                console.error("Error fetching package classes:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchClasses();
    }, [pkg.id]);
    
    const lessonsRemaining = pkg.totalLessons - pkg.usedLessons;

    return (
        <div className="bg-white h-full flex flex-col">
            <header className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800"><ArrowLeftIcon /></button>
                <div>
                    <h2 className="text-2xl font-bold text-zinc-800">Detalhes do Pacote</h2>
                    <p className="text-zinc-600">{student?.name || 'Aluno não encontrado'}</p>
                </div>
            </header>
            <main className="flex-grow overflow-y-auto pr-2 space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-zinc-100 p-3 rounded-lg"><p className="text-xs text-zinc-500">Aulas Compradas</p><p className="text-2xl font-bold text-zinc-800">{pkg.totalLessons}</p></div>
                    <div className="bg-amber-100 p-3 rounded-lg"><p className="text-xs text-amber-600">Aulas Usadas</p><p className="text-2xl font-bold text-amber-800">{pkg.usedLessons}</p></div>
                    <div className="bg-green-100 p-3 rounded-lg"><p className="text-xs text-green-600">Aulas Restantes</p><p className="text-2xl font-bold text-green-800">{lessonsRemaining}</p></div>
                </div>
                <section>
                    <h3 className="text-xl font-semibold text-zinc-700 mb-2">Histórico de Uso</h3>
                    <div className="border rounded-lg overflow-hidden">
                        {loading ? <p className="p-4 text-center">Carregando...</p> :
                        <table className="min-w-full divide-y">
                            <thead className="bg-zinc-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Disciplina</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Status</th></tr></thead>
                            <tbody className="bg-white divide-y">{usedClasses.map(c => <tr key={c.id}><td className="px-4 py-3 text-sm">{new Date(c.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td><td className="px-4 py-3 text-sm font-medium">{c.discipline}</td><td className="px-4 py-3 text-sm capitalize">{c.status}</td></tr>)}</tbody>
                        </table>}
                        {!loading && usedClasses.length === 0 && <p className="p-6 text-center text-zinc-500">Nenhuma aula utilizada deste pacote ainda.</p>}
                    </div>
                </section>
            </main>
        </div>
    );
}


// --- Main View Component ---

interface PackagesViewProps {
    onBack: () => void;
    currentUser: Collaborator;
}

const PackagesView: React.FC<PackagesViewProps> = ({ onBack, currentUser }) => {
    const { showToast } = useContext(ToastContext);
    const [packages, setPackages] = useState<LessonPackage[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<LessonPackage | null>(null);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const [pkgSnap, stdSnap] = await Promise.all([
                    db.collection("lessonPackages").orderBy("purchaseDate", "desc").get(),
                    db.collection("students").get(),
                ]);
                setPackages(pkgSnap.docs.map(d => ({ id: d.id, ...d.data() })) as LessonPackage[]);
                setStudents(stdSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Student[]);
            } catch (error) {
                console.error("Error fetching packages data:", error);
                showToast("Erro ao carregar os pacotes.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [showToast]);

    const studentMap = useMemo(() => new Map(students.map(s => [s.id, s.name])), [students]);
    
    const handleSavePackage = async (pkgData: Omit<LessonPackage, 'id'>) => {
        try {
            await db.collection('lessonPackages').add(sanitizeFirestore(pkgData));
            showToast('Pacote registrado com sucesso!', 'success');
        } catch (error) {
            console.error("Error saving package:", error);
            showToast("Falha ao salvar o pacote.", "error");
        }
    };
    
    if (selectedPackage) {
        return <PackageDetail pkg={selectedPackage} student={students.find(s => s.id === selectedPackage.studentId)} onBack={() => setSelectedPackage(null)} />;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <header className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800"><ArrowLeftIcon /></button>
                    <h2 className="text-2xl font-bold text-zinc-800">Pacotes de Aulas</h2>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-secondary-dark"><PlusIcon className="h-5 w-5" /> Novo Pacote</button>
            </header>
            <div className="flex-grow overflow-y-auto">
                {loading ? <div className="text-center py-10">Carregando...</div> :
                <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y">
                        <thead className="bg-zinc-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Aluno</th><th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Data Compra</th><th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Aulas</th><th className="relative px-6 py-3"><span className="sr-only">Ações</span></th></tr></thead>
                        <tbody className="bg-white divide-y">{packages.map(pkg => {
                            const lessonsRemaining = pkg.totalLessons - pkg.usedLessons;
                            return (
                            <tr key={pkg.id} className="hover:bg-zinc-50">
                                <td className="px-6 py-4 text-sm font-medium text-zinc-900">{studentMap.get(pkg.studentId) || 'Aluno não encontrado'}</td>
                                <td className="px-6 py-4 text-sm text-zinc-600">{new Date(pkg.purchaseDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                                <td className="px-6 py-4 text-sm"><span className={`font-semibold px-2 py-0.5 rounded-full ${lessonsRemaining > 0 ? 'bg-green-100 text-green-800' : 'bg-zinc-200 text-zinc-700'}`}>{lessonsRemaining} / {pkg.totalLessons}</span></td>
                                <td className="px-6 py-4 text-right text-sm"><button onClick={() => setSelectedPackage(pkg)} className="text-secondary font-semibold hover:underline">Ver Detalhes</button></td>
                            </tr>
                        )})}</tbody>
                    </table>
                </div>}
                {!loading && packages.length === 0 && <p className="text-center py-12 text-zinc-500">Nenhum pacote registrado.</p>}
            </div>
            <RegisterPackageModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSavePackage} students={students} currentUser={currentUser} />
        </div>
    );
};

export default PackagesView;