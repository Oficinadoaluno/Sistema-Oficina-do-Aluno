import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { db } from '../firebase';
import { Student, ClassPackage, ScheduledClass } from '../types';
import { ToastContext } from '../App';
import { ArrowLeftIcon, PlusIcon, XMarkIcon, MagnifyingGlassIcon } from './Icons';
import { sanitizeFirestore } from '../utils/sanitizeFirestore';

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

// --- Register Package Modal ---
interface RegisterPackageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newPackage: Omit<ClassPackage, 'id' | 'status'>) => Promise<void>;
    students: Student[];
}
const RegisterPackageModal: React.FC<RegisterPackageModalProps> = ({ isOpen, onClose, onSave, students }) => {
    const [studentId, setStudentId] = useState('');
    const [packageSize, setPackageSize] = useState<number | ''>('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [valuePaid, setValuePaid] = useState<number | ''>('');
    const [observations, setObservations] = useState('');

    const [studentSearch, setStudentSearch] = useState('');
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const studentDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
                setIsStudentDropdownOpen(false);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const selectedStudent = students.find(s => s.id === studentId);
        if (!selectedStudent || !packageSize) return;

        await onSave({
            studentId,
            studentName: selectedStudent.name,
            packageSize: Number(packageSize),
            purchaseDate,
            valuePaid: Number(valuePaid) || undefined,
            observations
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <form className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-zinc-800">Registrar Pacote de Aulas</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="p-6 space-y-4">
                    <div className="relative" ref={studentDropdownRef}>
                        <label htmlFor="student-search" className={labelStyle}>Aluno <span className="text-red-500">*</span></label>
                        <input
                            id="student-search" type="text" className={inputStyle}
                            value={studentId ? students.find(s => s.id === studentId)?.name || '' : studentSearch}
                            onChange={(e) => { setStudentSearch(e.target.value); setStudentId(''); setIsStudentDropdownOpen(true); }}
                            onFocus={() => setIsStudentDropdownOpen(true)} placeholder="Pesquisar aluno..." autoComplete="off" required
                        />
                        {isStudentDropdownOpen && (
                            <ul className="absolute z-20 w-full bg-white border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                {filteredStudents.map(s => (
                                    <li key={s.id} className="px-3 py-2 cursor-pointer hover:bg-zinc-100"
                                        onMouseDown={() => { setStudentId(s.id); setStudentSearch(''); setIsStudentDropdownOpen(false); }}>
                                        {s.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                        <label htmlFor="packageSize" className={labelStyle}>Quantidade de Aulas <span className="text-red-500">*</span></label>
                        <input id="packageSize" type="number" value={packageSize} onChange={e => setPackageSize(Number(e.target.value))} className={inputStyle} required />
                    </div>
                    <div>
                        <label htmlFor="purchaseDate" className={labelStyle}>Data da Compra <span className="text-red-500">*</span></label>
                        <input id="purchaseDate" type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className={inputStyle} required />
                    </div>
                    <div>
                        <label htmlFor="valuePaid" className={labelStyle}>Valor Pago (R$)</label>
                        <input id="valuePaid" type="number" step="0.01" value={valuePaid} onChange={e => setValuePaid(Number(e.target.value))} className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="observations" className={labelStyle}>Observações</label>
                        <textarea id="observations" value={observations} onChange={e => setObservations(e.target.value)} rows={2} className={inputStyle}></textarea>
                    </div>
                </main>
                <footer className="flex justify-end items-center gap-4 p-4 border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark">Salvar Pacote</button>
                </footer>
            </form>
        </div>
    );
};

// --- Package Detail View ---
interface PackageDetailProps {
    pkg: ClassPackage;
    usedClasses: ScheduledClass[];
    onBack: () => void;
}
const PackageDetail: React.FC<PackageDetailProps> = ({ pkg, usedClasses, onBack }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
             <header className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800"><ArrowLeftIcon /></button>
                <div>
                    <h2 className="text-2xl font-bold text-zinc-800">Detalhes do Pacote</h2>
                    <p className="text-zinc-600 font-semibold">{pkg.studentName}</p>
                </div>
            </header>
            <main className="flex-grow overflow-y-auto space-y-6">
                <div className="bg-zinc-50 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><p className="text-sm font-medium text-zinc-500">Aulas Contratadas</p><p className="text-zinc-800 font-bold text-lg">{pkg.packageSize}</p></div>
                    <div><p className="text-sm font-medium text-zinc-500">Aulas Utilizadas</p><p className="text-zinc-800 font-bold text-lg">{usedClasses.length}</p></div>
                    <div><p className="text-sm font-medium text-zinc-500">Aulas Restantes</p><p className="text-zinc-800 font-bold text-lg">{pkg.packageSize - usedClasses.length}</p></div>
                    <div><p className="text-sm font-medium text-zinc-500">Data da Compra</p><p className="text-zinc-800 font-bold text-lg">{new Date(pkg.purchaseDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p></div>
                </div>
                <section>
                    <h3 className="text-xl font-semibold text-zinc-700 mb-2">Histórico de Aulas do Pacote</h3>
                    <div className="border rounded-lg overflow-hidden">
                         <table className="min-w-full divide-y divide-zinc-200">
                             <thead className="bg-zinc-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Data da Aula</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Disciplina</th><th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Status</th></tr></thead>
                            <tbody className="bg-white divide-y divide-zinc-200">
                                {usedClasses.map(cls => (
                                    <tr key={cls.id}><td className="px-4 py-3 text-sm">{new Date(cls.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td><td className="px-4 py-3 text-sm font-medium">{cls.discipline}</td><td className="px-4 py-3 text-sm capitalize">{cls.status}</td></tr>
                                ))}
                            </tbody>
                        </table>
                        {usedClasses.length === 0 && <p className="p-6 text-center text-zinc-500">Nenhuma aula foi utilizada deste pacote ainda.</p>}
                    </div>
                </section>
            </main>
        </div>
    );
};

// --- Main Packages View ---
interface PackagesViewProps { onBack: () => void; }
const PackagesView: React.FC<PackagesViewProps> = ({ onBack: onBackToDashboard }) => {
    const { showToast } = useContext(ToastContext);
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [packages, setPackages] = useState<ClassPackage[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState<ClassPackage | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [pkgSnap, stdSnap, clsSnap] = await Promise.all([
                    db.collection("classPackages").orderBy("purchaseDate", "desc").get(),
                    db.collection("students").get(),
                    db.collection("scheduledClasses").where("packageId", "!=", null).get()
                ]);
                setPackages(pkgSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ClassPackage[]);
                setStudents(stdSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Student[]);
                setScheduledClasses(clsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ScheduledClass[]);
            } catch (error) {
                console.error("Error fetching packages data:", error);
                showToast("Erro ao carregar dados dos pacotes.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showToast]);

    const packagesWithUsage = useMemo(() => {
        return packages.map(pkg => {
            const usedCount = scheduledClasses.filter(c => c.packageId === pkg.id).length;
            const remainingCount = pkg.packageSize - usedCount;
            return { ...pkg, usedCount, remainingCount };
        });
    }, [packages, scheduledClasses]);

    const filteredPackages = useMemo(() => {
        return packagesWithUsage.filter(p => 
            p.studentName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [packagesWithUsage, searchTerm]);

    const handleSavePackage = async (newPackageData: Omit<ClassPackage, 'id' | 'status'>) => {
        try {
            const dataToSave = { ...newPackageData, status: 'active' as const };
            await db.collection('classPackages').add(sanitizeFirestore(dataToSave));
            showToast('Pacote registrado com sucesso!', 'success');
        } catch (error) {
            console.error("Error saving package:", error);
            showToast("Ocorreu um erro ao salvar o pacote.", "error");
        }
    };

    const handleViewDetails = (pkg: ClassPackage) => {
        setSelectedPackage(pkg);
        setView('detail');
    };

    if (view === 'detail' && selectedPackage) {
        const usedClassesForDetail = scheduledClasses.filter(c => c.packageId === selectedPackage.id);
        return <PackageDetail pkg={selectedPackage} usedClasses={usedClassesForDetail} onBack={() => setView('list')} />;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <RegisterPackageModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSavePackage}
                students={students}
            />
            <header className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <button onClick={onBackToDashboard} className="text-zinc-500 hover:text-zinc-800"><ArrowLeftIcon /></button>
                    <h2 className="text-2xl font-bold text-zinc-800">Pacotes de Aulas</h2>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-secondary-dark"><PlusIcon /><span>Registrar Pacote</span></button>
            </header>

            <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" /></div>
                <input type="text" placeholder="Buscar por nome do aluno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
            </div>

            <div className="flex-grow overflow-y-auto">
                {loading ? <p>Carregando...</p> : (
                    <table className="min-w-full divide-y divide-zinc-200">
                        <thead className="bg-zinc-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Aluno</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Aulas</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Progresso</th>
                                <th className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-zinc-200">
                            {filteredPackages.map(pkg => (
                                <tr key={pkg.id} className="hover:bg-zinc-50">
                                    <td className="px-6 py-4 font-medium">{pkg.studentName}</td>
                                    <td className="px-6 py-4 text-sm text-zinc-600">{pkg.usedCount} de {pkg.packageSize}</td>
                                    <td className="px-6 py-4">
                                        <div className="w-full bg-zinc-200 rounded-full h-2.5">
                                            <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${(pkg.usedCount / pkg.packageSize) * 100}%` }}></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm">
                                        <button onClick={() => handleViewDetails(pkg)} className="text-secondary hover:text-secondary-dark font-semibold">Ver Detalhes</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!loading && filteredPackages.length === 0 && <p className="text-center py-10 text-zinc-500">Nenhum pacote encontrado.</p>}
            </div>
        </div>
    );
};
export default PackagesView;
