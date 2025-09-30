import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Student, ClassPackage, ScheduledClass, Collaborator } from '../types';
import { ToastContext } from '../App';
import { ArrowLeftIcon, PlusIcon, XMarkIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from './Icons';
import { sanitizeFirestore, getShortName } from '../utils/sanitizeFirestore';

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

// --- Confirmation Modal ---
const ConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, onConfirm, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-zinc-800">{title}</h3>
                    <div className="mt-2 text-sm text-zinc-600 space-y-2">
                        {children}
                    </div>
                </div>
                <footer className="flex justify-end items-center gap-3 p-4 bg-zinc-50 rounded-b-xl">
                    <button onClick={onClose} className="py-2 px-4 bg-zinc-200 text-zinc-800 font-semibold rounded-lg hover:bg-zinc-300">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">
                        Confirmar Exclusão
                    </button>
                </footer>
            </div>
        </div>
    );
};


// --- Package Form Modal (for Create/Edit) ---
interface PackageFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (formData: Omit<ClassPackage, 'id' | 'status' | 'studentName'>, packageToEdit: ClassPackage | null) => Promise<void>;
    students: Student[];
    packageToEdit: ClassPackage | null;
}
const PackageFormModal: React.FC<PackageFormModalProps> = ({ isOpen, onClose, onSave, students, packageToEdit }) => {
    const isEditing = !!packageToEdit;
    const [studentId, setStudentId] = useState('');
    const [totalHours, setTotalHours] = useState<number | ''>('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [valuePaid, setValuePaid] = useState<number | ''>('');
    const [observations, setObservations] = useState('');

    const [studentSearch, setStudentSearch] = useState('');
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const studentDropdownRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        if (packageToEdit) {
            setStudentId(packageToEdit.studentId);
            setTotalHours(packageToEdit.totalHours);
            setPurchaseDate(packageToEdit.purchaseDate);
            setValuePaid(packageToEdit.valuePaid || '');
            setObservations(packageToEdit.observations || '');
        } else {
            setStudentId('');
            setTotalHours('');
            setPurchaseDate(new Date().toISOString().split('T')[0]);
            setValuePaid('');
            setObservations('');
        }
    }, [packageToEdit, isOpen]);

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
        if (!studentId || !totalHours) return;
        
        await onSave({
            studentId,
            totalHours: Number(totalHours),
            purchaseDate,
            valuePaid: Number(valuePaid) || undefined,
            observations
        }, packageToEdit);
        onClose();
    };

    if (!isOpen) return null;
    
    const selectedStudentName = useMemo(() => students.find(s => s.id === studentId)?.name || '', [studentId, students]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <form className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
                <header className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-zinc-800">{isEditing ? 'Editar Pacote' : 'Registrar Pacote de Aulas'}</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100"><XMarkIcon /></button>
                </header>
                <main className="p-6 space-y-4">
                    <div className="relative" ref={studentDropdownRef}>
                        <label htmlFor="student-search" className={labelStyle}>Aluno <span className="text-red-500">*</span></label>
                        <input
                            id="student-search" type="text" className={`${inputStyle} ${isEditing ? 'bg-zinc-200 cursor-not-allowed' : ''}`}
                            value={isEditing ? selectedStudentName : (studentId ? selectedStudentName : studentSearch)}
                            onChange={(e) => { if(!isEditing) { setStudentSearch(e.target.value); setStudentId(''); setIsStudentDropdownOpen(true); } }}
                            onFocus={() => {if(!isEditing) setIsStudentDropdownOpen(true)}} placeholder="Pesquisar aluno..." autoComplete="off" required readOnly={isEditing}
                        />
                        {isStudentDropdownOpen && !isEditing && (
                            <ul className="absolute z-20 w-full bg-white border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                {filteredStudents.map(s => (
                                    <li key={s.id} className="px-3 py-2 cursor-pointer hover:bg-zinc-100"
                                        onMouseDown={(e) => { e.preventDefault(); setStudentId(s.id); setStudentSearch(''); setIsStudentDropdownOpen(false); }}>
                                        {s.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                        <label htmlFor="totalHours" className={labelStyle}>Quantidade de Horas <span className="text-red-500">*</span></label>
                        <input id="totalHours" type="number" value={totalHours} onChange={e => setTotalHours(Number(e.target.value))} className={inputStyle} required />
                    </div>
                    <div>
                        <label htmlFor="purchaseDate" className={labelStyle}>Data da Compra <span className="text-red-500">*</span></label>
                        <input id="purchaseDate" type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className={inputStyle} required />
                    </div>
                    <div>
                        <label htmlFor="valuePaid" className={labelStyle}>Valor Pago (R$)</label>
                        <input id="valuePaid" type="number" step="0.01" value={valuePaid} onChange={e => setValuePaid(e.target.value === '' ? '' : Number(e.target.value))} className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="observations" className={labelStyle}>Observações</label>
                        <textarea id="observations" value={observations} onChange={e => setObservations(e.target.value)} rows={2} className={inputStyle}></textarea>
                    </div>
                </main>
                <footer className="flex justify-end items-center gap-4 p-4 border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200">Cancelar</button>
                    <button type="submit" className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark">{isEditing ? 'Salvar Alterações' : 'Salvar Pacote'}</button>
                </footer>
            </form>
        </div>
    );
};

type PackageWithUsage = ClassPackage & { usedHours: number; remainingHours: number };

// --- Main Packages View ---
interface PackagesViewProps { onBack: () => void; currentUser: Collaborator; }
const PackagesView: React.FC<PackagesViewProps> = ({ onBack: onBackToDashboard, currentUser }) => {
    const { showToast } = useContext(ToastContext);

    const [packages, setPackages] = useState<ClassPackage[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [packageToEdit, setPackageToEdit] = useState<ClassPackage | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [packageToDelete, setPackageToDelete] = useState<ClassPackage | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const unsubPackages = db.collection("classPackages").orderBy("purchaseDate", "desc").onSnapshot(
            snap => setPackages(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ClassPackage[]),
            err => { console.error(err); showToast("Erro ao carregar pacotes.", "error"); }
        );
        const unsubStudents = db.collection("students").onSnapshot(
            snap => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Student[]),
            err => { console.error(err); showToast("Erro ao carregar alunos.", "error"); }
        );
        const unsubClasses = db.collection("scheduledClasses").where("packageId", "!=", null).onSnapshot(
             snap => setScheduledClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ScheduledClass[]),
             err => { console.error(err); showToast("Erro ao carregar aulas vinculadas.", "error"); }
        );

        Promise.all([unsubPackages, unsubStudents, unsubClasses]).then(() => setLoading(false)).catch(() => setLoading(false));

        return () => { unsubPackages(); unsubStudents(); unsubClasses(); };
    }, [showToast]);

    const packagesWithUsage = useMemo((): PackageWithUsage[] => {
        return packages.map(pkg => {
            const usedHours = scheduledClasses.filter(c => c.packageId === pkg.id).reduce((sum, currentClass) => sum + (currentClass.duration / 60), 0);
            const remainingHours = pkg.totalHours - usedHours;
            return { ...pkg, usedHours, remainingHours };
        });
    }, [packages, scheduledClasses]);

    const filteredPackages = useMemo(() => {
        return packagesWithUsage.filter(p => 
            p.studentName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [packagesWithUsage, searchTerm]);

    const handleOpenModal = (pkg: ClassPackage | null = null) => {
        setPackageToEdit(pkg);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setPackageToEdit(null);
        setIsModalOpen(false);
    };

    const handleSavePackage = async (formData: Omit<ClassPackage, 'id' | 'status' | 'studentName'>, pkgToEdit: ClassPackage | null) => {
        const isEditing = !!pkgToEdit;
        try {
            const batch = db.batch();
            if (isEditing) {
                const packageRef = db.collection('classPackages').doc(pkgToEdit.id);
                let newTransactionId = pkgToEdit.transactionId;

                const oldValue = pkgToEdit.valuePaid || 0;
                const newValue = formData.valuePaid || 0;

                if (oldValue !== newValue) {
                    if (newValue > 0 && oldValue > 0 && pkgToEdit.transactionId) {
                        const txRef = db.collection('transactions').doc(pkgToEdit.transactionId);
                        batch.update(txRef, { amount: newValue, date: formData.purchaseDate });
                    } else if (newValue > 0 && oldValue === 0) {
                        const txData = { type: 'credit' as const, date: formData.purchaseDate, amount: newValue, studentId: pkgToEdit.studentId, description: `Compra de pacote de ${formData.totalHours} horas para ${pkgToEdit.studentName}`, registeredById: currentUser.id };
                        const newTxRef = db.collection('transactions').doc();
                        batch.set(newTxRef, sanitizeFirestore(txData as any));
                        newTransactionId = newTxRef.id;
                    } else if (newValue === 0 && oldValue > 0 && pkgToEdit.transactionId) {
                        const txRef = db.collection('transactions').doc(pkgToEdit.transactionId);
                        batch.delete(txRef);
                        newTransactionId = undefined;
                    }
                }

                const packageUpdateData = { ...formData, transactionId: newTransactionId };
                batch.update(packageRef, sanitizeFirestore(packageUpdateData as any));
                showToast('Pacote atualizado com sucesso!', 'success');

            } else { // Creating new package
                const student = students.find(s => s.id === formData.studentId);
                if (!student) throw new Error("Aluno não encontrado");

                const newPackageRef = db.collection('classPackages').doc();
                let transactionId: string | undefined = undefined;

                if (formData.valuePaid && formData.valuePaid > 0) {
                    const newTxRef = db.collection('transactions').doc();
                    transactionId = newTxRef.id;
                    const transactionData = { type: 'credit' as const, date: formData.purchaseDate, amount: formData.valuePaid, studentId: formData.studentId, description: `Compra de pacote de ${formData.totalHours} horas para ${student.name}`, registeredById: currentUser.id };
                    batch.set(newTxRef, sanitizeFirestore(transactionData as any));
                }
                const dataToSave = { ...formData, studentName: student.name, status: 'active' as const, transactionId };
                batch.set(newPackageRef, sanitizeFirestore(dataToSave as any));
                showToast('Pacote registrado com sucesso!', 'success');
            }
            await batch.commit();
        } catch (error) {
            console.error("Error saving package:", error);
            showToast("Ocorreu um erro ao salvar o pacote.", "error");
        }
    };

    const handleConfirmDelete = async () => {
        if (!packageToDelete) return;

        try {
            const batch = db.batch();

            if (packageToDelete.transactionId) {
                const txRef = db.collection('transactions').doc(packageToDelete.transactionId);
                batch.delete(txRef);
            }

            const classesQuery = db.collection('scheduledClasses').where('packageId', '==', packageToDelete.id);
            const classesSnap = await classesQuery.get();
            classesSnap.forEach(doc => {
                const classRef = db.collection('scheduledClasses').doc(doc.id);
                batch.update(classRef, {
                    packageId: firebase.firestore.FieldValue.delete(),
                    paymentStatus: 'pending'
                });
            });

            const pkgRef = db.collection('classPackages').doc(packageToDelete.id);
            batch.delete(pkgRef);

            await batch.commit();
            showToast('Pacote excluído com sucesso!', 'success');
        } catch (error) {
            console.error("Error deleting package:", error);
            showToast("Ocorreu um erro ao excluir o pacote.", "error");
        } finally {
            setIsConfirmModalOpen(false);
            setPackageToDelete(null);
        }
    };

    const handleDeleteClick = (pkg: ClassPackage) => {
        setPackageToDelete(pkg);
        setIsConfirmModalOpen(true);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Exclusão"
            >
                <p>Tem certeza que deseja excluir o pacote de <strong>{packageToDelete?.totalHours} horas</strong> de <strong>{packageToDelete?.studentName}</strong>?</p>
                <p className="mt-2 text-amber-800 bg-amber-50 p-2 rounded-md border border-amber-200">Esta ação não pode ser desfeita e irá desvincular todas as aulas pagas com este pacote, marcando-as como pendentes de pagamento.</p>
            </ConfirmationModal>

            <PackageFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSavePackage}
                students={students}
                packageToEdit={packageToEdit}
            />
            <header className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <button onClick={onBackToDashboard} className="text-zinc-500 hover:text-zinc-800"><ArrowLeftIcon /></button>
                    <h2 className="text-2xl font-bold text-zinc-800">Pacotes de Aulas</h2>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-secondary-dark"><PlusIcon /><span>Registrar Pacote</span></button>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Progresso (Horas)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Progresso</th>
                                <th className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-zinc-200">
                            {filteredPackages.map(pkg => (
                                <tr key={pkg.id} className="hover:bg-zinc-50">
                                    <td className="px-6 py-4 font-medium" title={pkg.studentName}>{getShortName(pkg.studentName)}</td>
                                    <td className="px-6 py-4 text-sm text-zinc-600">{pkg.usedHours.toFixed(1)} de {pkg.totalHours}</td>
                                    <td className="px-6 py-4">
                                        <div className="w-full bg-zinc-200 rounded-full h-2.5">
                                            <div className={`h-2.5 rounded-full ${pkg.remainingHours <= 3 ? 'bg-red-500' : 'bg-secondary'}`} style={{ width: `${(pkg.usedHours / pkg.totalHours) * 100}%` }}></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm">
                                        <div className="flex items-center justify-end gap-4">
                                            <button onClick={() => handleOpenModal(pkg)} className="text-secondary hover:text-secondary-dark font-semibold flex items-center gap-1"><PencilIcon className="h-4 w-4"/> Editar</button>
                                            <button onClick={() => handleDeleteClick(pkg)} className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"><TrashIcon className="h-4 w-4"/> Excluir</button>
                                        </div>
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