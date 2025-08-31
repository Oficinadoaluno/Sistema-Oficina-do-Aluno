import React, { useState, useMemo, useEffect, useContext } from 'react';
import AddStudentForm from './AddStudentForm';
import StudentDetail from './StudentDetail';
import { Student, Collaborator } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ArrowLeftIcon, MagnifyingGlassIcon, PlusIcon } from './Icons';
import { ToastContext } from '../App';

interface StudentListProps {
    onBack: () => void;
    currentUser: Collaborator;
}

const StudentList: React.FC<StudentListProps> = ({ onBack: onBackToDashboard, currentUser }) => {
    const [view, setView] = useState<'list' | 'add' | 'detail' | 'edit'>('list');
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSchool, setSelectedSchool] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const { showToast } = useContext(ToastContext);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "students"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const studentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Student[];
            setStudents(studentsData);
            setLoading(false);
        }, (error) => {
            console.error("Firestore (StudentList) Error:", error);
            setLoading(false);
            if (error.code === 'permission-denied') {
                console.error("Erro de Permissão: Verifique as regras de segurança do Firestore para a coleção 'students'.");
                showToast("Você não tem permissão para listar os alunos.", "error");
            } else if (error.code === 'failed-precondition') {
                console.error("Erro de Pré-condição: Um índice para a query de alunos está faltando. Verifique o console para o link de criação do índice.");
                showToast("Erro de configuração do banco de dados (índice ausente).", "error");
            } else if (error.code === 'unavailable') {
                console.error("Erro de Rede: Não foi possível conectar ao Firestore.");
                showToast("Erro de conexão. Verifique sua internet.", "error");
            } else {
                showToast("Ocorreu um erro ao buscar os alunos.", "error");
            }
        });
        return () => unsubscribe();
    }, [showToast]);

    const schools = useMemo(() => [...new Set(students.map(s => s.school))].sort(), [students]);
    const grades = useMemo(() => [...new Set(students.map(s => s.grade))].sort(), [students]);

    const filteredStudents = useMemo(() => students.filter(student => {
        const matchesSearch = searchTerm === '' ||
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.guardian.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesSchool = selectedSchool === '' || student.school === selectedSchool;
        
        const matchesGrade = selectedGrade === '' || student.grade === selectedGrade;

        let matchesStatus = false;
        if (selectedStatus === '') {
            matchesStatus = student.status === 'matricula' || student.status === 'prospeccao';
        } else {
            matchesStatus = student.status === selectedStatus;
        }

        return matchesSearch && matchesSchool && matchesGrade && matchesStatus;
    }), [students, searchTerm, selectedSchool, selectedGrade, selectedStatus]);
    
    const handleViewDetails = (student: Student) => {
        setSelectedStudent(student);
        setView('detail');
    };
    
    const handleBackToList = () => {
        if (view === 'edit') {
            setView('detail');
        } else {
            setSelectedStudent(null);
            setView('list');
        }
    };
    
    if (view === 'add') {
        return <AddStudentForm onBack={() => setView('list')} />;
    }

    if (view === 'edit' && selectedStudent) {
        return <AddStudentForm onBack={handleBackToList} studentToEdit={selectedStudent} />;
    }

    if (view === 'detail' && selectedStudent) {
        return <StudentDetail student={selectedStudent} onBack={handleBackToList} onEdit={() => setView('edit')} currentUser={currentUser} />;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                 <div className="flex items-center gap-4">
                     <button onClick={onBackToDashboard} className="text-zinc-500 hover:text-zinc-800 transition-colors">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-zinc-800">
                        Alunos
                        <span className="text-lg font-normal text-zinc-500 ml-2">({filteredStudents.length} encontrados)</span>
                    </h2>
                </div>
                <button onClick={() => setView('add')} className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-dark text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                    <PlusIcon className="h-5 w-5" />
                    <span>Novo Aluno</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="relative md:col-span-2">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou responsável..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow"
                    />
                </div>
                 <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow bg-white"
                >
                    <option value="">Alunos Ativos</option>
                    <option value="matricula">Matriculados</option>
                    <option value="prospeccao">Prospecção</option>
                    <option value="inativo">Inativos</option>
                </select>
                 <select
                    value={selectedSchool}
                    onChange={(e) => setSelectedSchool(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow bg-white"
                >
                    <option value="">Todos os Colégios</option>
                    {schools.map(school => <option key={school} value={school}>{school}</option>)}
                </select>

                <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow bg-white"
                >
                    <option value="">Todas as Séries</option>
                    {grades.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                </select>
            </div>

            <div className="flex-grow overflow-y-auto">
                {loading ? <div className="text-center py-10">Carregando alunos...</div> :
                <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-zinc-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Nome</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Responsável</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Colégio</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Série</th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Ações</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-200">
                        {filteredStudents.map((student) => (
                            <tr key={student.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-zinc-900">{student.name}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-zinc-600">{student.guardian}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-zinc-600">{student.school}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-secondary/10 text-secondary-dark">{student.grade}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleViewDetails(student)} className="text-secondary hover:text-secondary-dark font-semibold">Ver mais</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>}
                 {!loading && filteredStudents.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-zinc-500">Nenhum aluno encontrado com os filtros aplicados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentList;
