// FIX: The entire file has been updated to use controlled components and sanitize data.
import React, { useState, useContext } from 'react';
import { Student } from '../types';
import { ArrowLeftIcon } from './Icons';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ToastContext } from '../App';

// FIX: Create a utility function to recursively remove undefined keys from an object.
// This ensures that no 'undefined' values are sent to Firestore, which can cause errors or inconsistencies.
const sanitizeFirestore = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeFirestore).filter(item => item !== undefined);
    }

    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (value !== undefined) {
                const sanitizedValue = sanitizeFirestore(value);
                // Also check if the sanitized value is not undefined (e.g., from a nested object)
                if (sanitizedValue !== undefined) {
                    newObj[key] = sanitizedValue;
                }
            }
        }
    }
    // Return undefined if the object becomes empty after sanitation, so it can be stripped by parent calls.
    if (Object.keys(newObj).length === 0) {
        return undefined;
    }
    return newObj;
};

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

const gradeOptions = [
    '1º Ano - Fundamental', '2º Ano - Fundamental', '3º Ano - Fundamental', '4º Ano - Fundamental', '5º Ano - Fundamental',
    '6º Ano - Fundamental', '7º Ano - Fundamental', '8º Ano - Fundamental', '9º Ano - Fundamental',
    '1º Ano - Médio', '2º Ano - Médio', '3º Ano - Médio',
    'Pré-vestibular', 'Superior', 'Outro'
];

const validateCPF = (cpf: string): boolean => {
    if (!cpf) return true; // Optional field is valid if empty
    const cpfClean = cpf.replace(/[^\d]/g, '');

    if (cpfClean.length !== 11 || /^(\d)\1{10}$/.test(cpfClean)) {
        return false;
    }

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpfClean.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
        remainder = 0;
    }
    if (remainder !== parseInt(cpfClean.substring(9, 10))) {
        return false;
    }

    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpfClean.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
        remainder = 0;
    }
    if (remainder !== parseInt(cpfClean.substring(10, 11))) {
        return false;
    }

    return true;
};

const phoneMask = (v: string): string => {
  if (!v) return "";
  v = v.replace(/\D/g, '');
  v = v.substring(0, 11);
  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (v.length > 6) {
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  } else {
    v = v.replace(/^(\d*)/, '($1');
  }
  return v;
};

interface AddStudentFormProps {
    onBack: () => void;
    studentToEdit?: Student;
}

const AddStudentForm: React.FC<AddStudentFormProps> = ({ onBack, studentToEdit }) => {
    const { showToast } = useContext(ToastContext);
    const isEditing = !!studentToEdit;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cpfError, setCpfError] = useState('');

    // FIX: Convert all form fields to controlled components using useState.
    // This ensures React manages the state of every input, preventing unexpected behavior
    // and making it easier to handle data before submission. Optional fields are defaulted to ''.
    
    // Status
    const [status, setStatus] = useState<Student['status']>(studentToEdit?.status || 'prospeccao');

    // Student Data
    const [fullName, setFullName] = useState(studentToEdit?.name || '');
    const [birthDate, setBirthDate] = useState(studentToEdit?.birthDate || '');
    const [school, setSchool] = useState(studentToEdit?.school || '');
    const [schoolUnit, setSchoolUnit] = useState(studentToEdit?.schoolUnit || '');
    const [grade, setGrade] = useState(studentToEdit?.grade || '');
    const [otherGrade, setOtherGrade] = useState(''); // State for custom grade
    const [neurodiversity, setNeurodiversity] = useState(studentToEdit?.neurodiversity || '');
    const [objective, setObjective] = useState(studentToEdit?.objective || '');
    const [phone, setPhone] = useState(studentToEdit?.phone || '');
    const [email, setEmail] = useState(studentToEdit?.email || '');
    const [schoolLogin, setSchoolLogin] = useState(studentToEdit?.schoolLogin || '');
    const [schoolPassword, setSchoolPassword] = useState(studentToEdit?.schoolPassword || '');
    const [didacticMaterial, setDidacticMaterial] = useState(studentToEdit?.didacticMaterial || '');
    const [medications, setMedications] = useState(studentToEdit?.medications || '');
    
    // Guardian Data
    const [motherName, setMotherName] = useState(studentToEdit?.motherName || '');
    const [fatherName, setFatherName] = useState(studentToEdit?.fatherName || '');
    const [financialGuardian, setFinancialGuardian] = useState<Student['financialGuardian']>(studentToEdit?.financialGuardian || 'mae');
    const [otherGuardianName, setOtherGuardianName] = useState(studentToEdit?.otherGuardianName || '');
    const [guardianAddress, setGuardianAddress] = useState(studentToEdit?.guardianAddress || '');
    const [guardianPhone, setGuardianPhone] = useState(studentToEdit?.guardianPhone || '');
    const [guardianMobile, setGuardianMobile] = useState(studentToEdit?.guardianMobile || '');
    const [guardianEmail, setGuardianEmail] = useState(studentToEdit?.guardianEmail || '');
    const [guardianCpf, setGuardianCpf] = useState(studentToEdit?.guardianCpf || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCpfError('');

        if (guardianCpf && !validateCPF(guardianCpf)) {
            setCpfError('CPF do responsável inválido.');
            showToast('Por favor, corrija o CPF do responsável.', 'error');
            return;
        }

        if (!fullName.trim() || !objective.trim()) {
            showToast('Por favor, preencha os campos obrigatórios: Nome Completo e Principal Objetivo.', 'error');
            return;
        }
        setIsSubmitting(true);

        // FIX: Build the student data object directly from state variables instead of FormData.
        // This is the standard React practice for controlled forms and gives us full control over the data.
        const studentData = {
          name: fullName,
          guardian: motherName || fatherName || otherGuardianName,
          school,
          grade: grade === 'Outro' ? otherGrade : grade,
          status,
          credits: studentToEdit?.credits ?? 0,
          hasMonthlyPlan: studentToEdit?.hasMonthlyPlan ?? false,
          birthDate,
          schoolUnit,
          neurodiversity,
          objective,
          phone: phone.replace(/\D/g, ''),
          email,
          schoolLogin,
          schoolPassword,
          didacticMaterial,
          medications,
          motherName,
          fatherName,
          financialGuardian,
          otherGuardianName: financialGuardian === 'outro' ? otherGuardianName : undefined, // Set to undefined if not relevant
          guardianAddress,
          guardianPhone: guardianPhone.replace(/\D/g, ''),
          guardianMobile: guardianMobile.replace(/\D/g, ''),
          guardianEmail,
          guardianCpf,
        };
        
        // FIX: Sanitize the data object to remove any 'undefined' properties before sending to Firestore.
        const sanitizedData = sanitizeFirestore(studentData);

        try {
            if (isEditing) {
                const studentRef = doc(db, "students", studentToEdit.id);
                await updateDoc(studentRef, sanitizedData);
            } else {
                await addDoc(collection(db, "students"), sanitizedData);
            }
            showToast(isEditing ? 'Dados do aluno atualizados com sucesso!' : 'Aluno cadastrado com sucesso!', 'success');
            onBack();
        } catch (error: any) {
            console.error("Error saving student:", error);
            if (error.code === 'permission-denied') {
                console.error("Erro de Permissão: Verifique as regras de segurança do Firestore para a coleção 'students'.");
                showToast("Você não tem permissão para salvar este aluno.", "error");
            } else if (error.code === 'unavailable') {
                console.error("Erro de Rede: Não foi possível conectar ao Firestore.");
                showToast("Erro de conexão. Verifique sua internet e tente novamente.", "error");
            } else {
                showToast("Ocorreu um erro ao salvar o aluno.", 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in-view">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-zinc-500 hover:text-zinc-800 transition-colors">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-zinc-800">{isEditing ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}</h2>
            </div>
            
             {/* FIX: Form elements now use 'value' and 'onChange' to be fully controlled. */}
            <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto space-y-8 pr-2">
                <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 mb-2">Status do Cadastro</legend>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="status" value="prospeccao" checked={status === 'prospeccao'} onChange={(e) => setStatus(e.target.value as Student['status'])} className="h-4 w-4 text-secondary focus:ring-secondary" /> <span className="font-medium text-zinc-700">Prospecção</span></label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="status" value="matricula" checked={status === 'matricula'} onChange={(e) => setStatus(e.target.value as Student['status'])} className="h-4 w-4 text-secondary focus:ring-secondary" /> <span className="font-medium text-zinc-700">Matrícula</span></label>
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Dados do Aluno</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="md:col-span-2"><label htmlFor="fullName" className={labelStyle}>Nome Completo <span className="text-red-500">*</span></label><input type="text" id="fullName" name="fullName" className={inputStyle} required value={fullName} onChange={e => setFullName(e.target.value)} /></div>
                        <div><label htmlFor="birthDate" className={labelStyle}>Data de Nascimento</label><input type="date" id="birthDate" name="birthDate" className={inputStyle} value={birthDate} onChange={e => setBirthDate(e.target.value)}/></div>
                        <div><label htmlFor="school" className={labelStyle}>Colégio</label><input type="text" id="school" name="school" className={inputStyle} value={school} onChange={e => setSchool(e.target.value)}/></div>
                        <div><label htmlFor="schoolUnit" className={labelStyle}>Unidade</label><input type="text" id="schoolUnit" name="schoolUnit" className={inputStyle} value={schoolUnit} onChange={e => setSchoolUnit(e.target.value)}/></div>
                        <div><label htmlFor="grade" className={labelStyle}>Ano/Série</label><select id="grade" name="grade" className={inputStyle} value={grade} onChange={e => setGrade(e.target.value)}><option value="">Selecione...</option>{gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                        {grade === 'Outro' && (<div><label htmlFor="otherGrade" className={labelStyle}>Qual?</label><input type="text" id="otherGrade" name="otherGrade" className={inputStyle} placeholder="Digite a série" value={otherGrade} onChange={e => setOtherGrade(e.target.value)} /></div>)}
                        <div className="md:col-span-2"><label htmlFor="neurodiversity" className={labelStyle}>Neurodivergência/Deficiências/Limitações</label><textarea id="neurodiversity" name="neurodiversity" rows={3} className={inputStyle} value={neurodiversity} onChange={e => setNeurodiversity(e.target.value)}></textarea></div>
                         <div className="md:col-span-2"><label htmlFor="objective" className={labelStyle}>Principal Objetivo <span className="text-red-500">*</span></label><input type="text" id="objective" name="objective" className={inputStyle} required value={objective} onChange={e => setObjective(e.target.value)} /></div>
                        <div><label htmlFor="phone" className={labelStyle}>Telefone</label><input type="tel" id="phone" name="phone" className={inputStyle} value={phoneMask(phone)} onChange={e => setPhone(e.target.value)} /></div>
                        <div><label htmlFor="email" className={labelStyle}>Email</label><input type="email" id="email" name="email" className={inputStyle} value={email} onChange={e => setEmail(e.target.value)}/></div>
                         <div><label htmlFor="schoolLogin" className={labelStyle}>Login do Sistema da Escola</label><input type="text" id="schoolLogin" name="schoolLogin" className={inputStyle} value={schoolLogin} onChange={e => setSchoolLogin(e.target.value)}/></div>
                         <div><label htmlFor="schoolPassword" className={labelStyle}>Senha do Sistema da Escola</label><input type="text" id="schoolPassword" name="schoolPassword" className={inputStyle} value={schoolPassword} onChange={e => setSchoolPassword(e.target.value)}/></div>
                         <div className="md:col-span-2"><label htmlFor="didacticMaterial" className={labelStyle}>Material Didático/Editora</label><input type="text" id="didacticMaterial" name="didacticMaterial" className={inputStyle} value={didacticMaterial} onChange={e => setDidacticMaterial(e.target.value)}/></div>
                        <div className="md:col-span-2"><label htmlFor="medications" className={labelStyle}>Medicamentos e Instruções</label><textarea id="medications" name="medications" rows={3} className={inputStyle} value={medications} onChange={e => setMedications(e.target.value)}></textarea></div>
                    </div>
                </fieldset>
                
                 <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Dados dos Responsáveis</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div><label htmlFor="motherName" className={labelStyle}>Nome da Mãe</label><input type="text" id="motherName" name="motherName" className={inputStyle} value={motherName} onChange={e => setMotherName(e.target.value)}/></div>
                         <div><label htmlFor="fatherName" className={labelStyle}>Nome do Pai</label><input type="text" id="fatherName" name="fatherName" className={inputStyle} value={fatherName} onChange={e => setFatherName(e.target.value)}/></div>
                         <div><label htmlFor="financialGuardian" className={labelStyle}>Responsável Financeiro</label><select id="financialGuardian" name="financialGuardian" className={inputStyle} value={financialGuardian} onChange={e => setFinancialGuardian(e.target.value as NonNullable<Student['financialGuardian']>)}><option value="mae">Mãe</option><option value="pai">Pai</option><option value="outro">Outro</option></select></div>
                        {financialGuardian === 'outro' && (<div><label htmlFor="otherGuardianName" className={labelStyle}>Nome do Responsável Financeiro</label><input type="text" id="otherGuardianName" name="otherGuardianName" className={inputStyle} value={otherGuardianName} onChange={e => setOtherGuardianName(e.target.value)}/></div>)}
                         <div className="md:col-span-2"><label htmlFor="guardianAddress" className={labelStyle}>Endereço</label><input type="text" id="guardianAddress" name="guardianAddress" className={inputStyle} value={guardianAddress} onChange={e => setGuardianAddress(e.target.value)}/></div>
                          <div><label htmlFor="guardianPhone" className={labelStyle}>Telefone do Responsável</label><input type="tel" id="guardianPhone" name="guardianPhone" className={inputStyle} value={phoneMask(guardianPhone)} onChange={e => setGuardianPhone(e.target.value)} /></div>
                         <div><label htmlFor="guardianMobile" className={labelStyle}>Celular do Responsável</label><input type="tel" id="guardianMobile" name="guardianMobile" className={inputStyle} value={phoneMask(guardianMobile)} onChange={e => setGuardianMobile(e.target.value)} /></div>
                        <div><label htmlFor="guardianEmail" className={labelStyle}>Email do Responsável</label><input type="email" id="guardianEmail" name="guardianEmail" className={inputStyle} value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)}/></div>
                        <div>
                            <label htmlFor="guardianCpf" className={labelStyle}>CPF do Responsável</label>
                            <input type="text" id="guardianCpf" name="guardianCpf" className={inputStyle} value={guardianCpf} onChange={e => setGuardianCpf(e.target.value)} />
                             {cpfError && <p className="text-sm text-red-600 mt-1">{cpfError}</p>}
                        </div>
                    </div>
                 </fieldset>

                <div className="flex justify-end items-center gap-4 pt-4 border-t">
                    <button type="button" onClick={onBack} disabled={isSubmitting} className="py-2 px-4 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200 transition-colors">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark transition-colors transform hover:scale-105 disabled:bg-zinc-400">
                        {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar Aluno')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddStudentForm;
