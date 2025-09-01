import React, { useState, useContext, useEffect } from 'react';
import { Student } from '../types';
import { ArrowLeftIcon } from './Icons';
import { db } from '../firebase';
import { ToastContext } from '../App';
import { sanitizeFirestore, onlyDigits, phoneMask, validateCPF } from '../utils/sanitizeFirestore';

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

const gradeOptions = [
    '1º Ano - Fundamental', '2º Ano - Fundamental', '3º Ano - Fundamental', '4º Ano - Fundamental', '5º Ano - Fundamental',
    '6º Ano - Fundamental', '7º Ano - Fundamental', '8º Ano - Fundamental', '9º Ano - Fundamental',
    '1º Ano - Médio', '2º Ano - Médio', '3º Ano - Médio',
    'Pré-vestibular', 'Superior', 'Outro'
];

interface AddStudentFormProps {
    onBack: () => void;
    studentToEdit?: Student;
}

const AddStudentForm: React.FC<AddStudentFormProps> = ({ onBack, studentToEdit }) => {
    const { showToast } = useContext(ToastContext) as { showToast: (message: string, type?: 'success' | 'error' | 'info') => void; };
    const isEditing = !!studentToEdit;
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cpfError, setCpfError] = useState('');

    const [status, setStatus] = useState<Student['status']>('prospeccao');
    const [fullName, setFullName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [school, setSchool] = useState('');
    const [schoolUnit, setSchoolUnit] = useState('');
    const [grade, setGrade] = useState('');
    const [otherGrade, setOtherGrade] = useState('');
    const [neurodiversity, setNeurodiversity] = useState('');
    const [objective, setObjective] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [schoolLogin, setSchoolLogin] = useState('');
    const [schoolPassword, setSchoolPassword] = useState('');
    const [didacticMaterial, setDidacticMaterial] = useState('');
    const [medications, setMedications] = useState('');
    const [motherName, setMotherName] = useState('');
    const [fatherName, setFatherName] = useState('');
    const [financialGuardian, setFinancialGuardian] = useState<Student['financialGuardian']>('mae');
    const [otherGuardianName, setOtherGuardianName] = useState('');
    const [guardianAddress, setGuardianAddress] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [guardianMobile, setGuardianMobile] = useState('');
    const [guardianEmail, setGuardianEmail] = useState('');
    const [guardianCpf, setGuardianCpf] = useState('');

    useEffect(() => {
        if (studentToEdit) {
            setStatus(studentToEdit.status || 'prospeccao');
            setFullName(studentToEdit.name || '');
            setBirthDate(studentToEdit.birthDate || '');
            setSchool(studentToEdit.school || '');
            setSchoolUnit(studentToEdit.schoolUnit || '');
            setGrade(studentToEdit.grade || '');
            setNeurodiversity(studentToEdit.neurodiversity || '');
            setObjective(studentToEdit.objective || '');
            setPhone(phoneMask(studentToEdit.phone || ''));
            setEmail(studentToEdit.email || '');
            setSchoolLogin(studentToEdit.schoolLogin || '');
            setSchoolPassword(studentToEdit.schoolPassword || '');
            setDidacticMaterial(studentToEdit.didacticMaterial || '');
            setMedications(studentToEdit.medications || '');
            setMotherName(studentToEdit.motherName || '');
            setFatherName(studentToEdit.fatherName || '');
            setFinancialGuardian(studentToEdit.financialGuardian || 'mae');
            setOtherGuardianName(studentToEdit.otherGuardianName || '');
            setGuardianAddress(studentToEdit.guardianAddress || '');
            setGuardianPhone(phoneMask(studentToEdit.guardianPhone || ''));
            setGuardianMobile(phoneMask(studentToEdit.guardianMobile || ''));
            setGuardianEmail(studentToEdit.guardianEmail || '');
            setGuardianCpf(studentToEdit.guardianCpf || '');
        } else {
            // Reset form for new entry
            setStatus('prospeccao');
            setFullName('');
            setBirthDate('');
            setSchool('');
            setSchoolUnit('');
            setGrade('');
            setOtherGrade('');
            setNeurodiversity('');
            setObjective('');
            setPhone('');
            setEmail('');
            setSchoolLogin('');
            setSchoolPassword('');
            setDidacticMaterial('');
            setMedications('');
            setMotherName('');
            setFatherName('');
            setFinancialGuardian('mae');
            setOtherGuardianName('');
            setGuardianAddress('');
            setGuardianPhone('');
            setGuardianMobile('');
            setGuardianEmail('');
            setGuardianCpf('');
        }
    }, [studentToEdit]);


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

        const studentData = {
          name: fullName,
          guardian: motherName || fatherName || otherGuardianName || '',
          school,
          grade: grade === 'Outro' ? otherGrade : grade,
          status,
          credits: studentToEdit?.credits ?? 0,
          hasMonthlyPlan: studentToEdit?.hasMonthlyPlan ?? false,
          birthDate,
          schoolUnit,
          neurodiversity,
          objective,
          phone: onlyDigits(phone),
          email,
          schoolLogin,
          schoolPassword,
          didacticMaterial,
          medications,
          motherName,
          fatherName,
          financialGuardian,
          otherGuardianName: financialGuardian === 'outro' ? otherGuardianName : undefined,
          guardianAddress,
          guardianPhone: onlyDigits(guardianPhone),
          guardianMobile: onlyDigits(guardianMobile),
          guardianEmail,
          guardianCpf: onlyDigits(guardianCpf),
        };
        
        const sanitizedData = sanitizeFirestore(studentData);

        try {
            if (isEditing) {
                const studentRef = db.collection("students").doc(studentToEdit.id);
                await studentRef.update(sanitizedData);
                showToast('Dados do aluno atualizados com sucesso!', 'success');
            } else {
                await db.collection("students").add(sanitizedData);
                showToast('Aluno cadastrado com sucesso!', 'success');
            }
            onBack();
        } catch (error: any) {
            console.error("Error saving student:", error);
            if (error.code === 'permission-denied') {
                showToast("Erro de permissão. Verifique as regras de segurança do Firestore.", "error");
            } else {
                showToast("Erro de rede ou ao salvar os dados. Tente novamente.", 'error');
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
            
            <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto space-y-8 pr-2">
                <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 mb-2">Status do Cadastro</legend>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="status" value="prospeccao" checked={status === 'prospeccao'} onChange={(e) => setStatus(e.target.value as Student['status'])} className="h-4 w-4 text-secondary focus:ring-secondary" disabled={isSubmitting} /> <span className="font-medium text-zinc-700">Prospecção</span></label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="status" value="matricula" checked={status === 'matricula'} onChange={(e) => setStatus(e.target.value as Student['status'])} className="h-4 w-4 text-secondary focus:ring-secondary" disabled={isSubmitting} /> <span className="font-medium text-zinc-700">Matrícula</span></label>
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Dados do Aluno</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="md:col-span-2"><label htmlFor="fullName" className={labelStyle}>Nome Completo <span className="text-red-500">*</span></label><input type="text" id="fullName" className={inputStyle} required value={fullName} onChange={e => setFullName(e.target.value)} disabled={isSubmitting} /></div>
                        <div><label htmlFor="birthDate" className={labelStyle}>Data de Nascimento</label><input type="date" id="birthDate" className={inputStyle} value={birthDate} onChange={e => setBirthDate(e.target.value)} disabled={isSubmitting}/></div>
                        <div><label htmlFor="school" className={labelStyle}>Colégio</label><input type="text" id="school" className={inputStyle} value={school} onChange={e => setSchool(e.target.value)} disabled={isSubmitting}/></div>
                        <div><label htmlFor="schoolUnit" className={labelStyle}>Unidade</label><input type="text" id="schoolUnit" className={inputStyle} value={schoolUnit} onChange={e => setSchoolUnit(e.target.value)} disabled={isSubmitting}/></div>
                        <div><label htmlFor="grade" className={labelStyle}>Ano/Série</label><select id="grade" className={inputStyle} value={grade} onChange={e => setGrade(e.target.value)} disabled={isSubmitting}><option value="">Selecione...</option>{gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                        {grade === 'Outro' && (<div><label htmlFor="otherGrade" className={labelStyle}>Qual?</label><input type="text" id="otherGrade" className={inputStyle} placeholder="Digite a série" value={otherGrade} onChange={e => setOtherGrade(e.target.value)} disabled={isSubmitting} /></div>)}
                        <div className="md:col-span-2"><label htmlFor="neurodiversity" className={labelStyle}>Neurodivergência/Deficiências/Limitações</label><textarea id="neurodiversity" rows={3} className={inputStyle} value={neurodiversity} onChange={e => setNeurodiversity(e.target.value)} disabled={isSubmitting}></textarea></div>
                         <div className="md:col-span-2"><label htmlFor="objective" className={labelStyle}>Principal Objetivo <span className="text-red-500">*</span></label><input type="text" id="objective" className={inputStyle} required value={objective} onChange={e => setObjective(e.target.value)} disabled={isSubmitting} /></div>
                        <div><label htmlFor="phone" className={labelStyle}>Telefone</label><input type="tel" id="phone" className={inputStyle} value={phone} onChange={e => setPhone(phoneMask(e.target.value))} disabled={isSubmitting} /></div>
                        <div><label htmlFor="email" className={labelStyle}>Email</label><input type="email" id="email" className={inputStyle} value={email} onChange={e => setEmail(e.target.value)} disabled={isSubmitting}/></div>
                         <div><label htmlFor="schoolLogin" className={labelStyle}>Login do Sistema da Escola</label><input type="text" id="schoolLogin" className={inputStyle} value={schoolLogin} onChange={e => setSchoolLogin(e.target.value)} disabled={isSubmitting}/></div>
                         <div><label htmlFor="schoolPassword" className={labelStyle}>Senha do Sistema da Escola</label><input type="text" id="schoolPassword" className={inputStyle} value={schoolPassword} onChange={e => setSchoolPassword(e.target.value)} disabled={isSubmitting}/></div>
                         <div className="md:col-span-2"><label htmlFor="didacticMaterial" className={labelStyle}>Material Didático/Editora</label><input type="text" id="didacticMaterial" className={inputStyle} value={didacticMaterial} onChange={e => setDidacticMaterial(e.target.value)} disabled={isSubmitting}/></div>
                        <div className="md:col-span-2"><label htmlFor="medications" className={labelStyle}>Medicamentos e Instruções</label><textarea id="medications" rows={3} className={inputStyle} value={medications} onChange={e => setMedications(e.target.value)} disabled={isSubmitting}></textarea></div>
                    </div>
                </fieldset>
                
                 <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Dados dos Responsáveis</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div><label htmlFor="motherName" className={labelStyle}>Nome da Mãe</label><input type="text" id="motherName" className={inputStyle} value={motherName} onChange={e => setMotherName(e.target.value)} disabled={isSubmitting}/></div>
                         <div><label htmlFor="fatherName" className={labelStyle}>Nome do Pai</label><input type="text" id="fatherName" className={inputStyle} value={fatherName} onChange={e => setFatherName(e.target.value)} disabled={isSubmitting}/></div>
                         <div><label htmlFor="financialGuardian" className={labelStyle}>Responsável Financeiro</label><select id="financialGuardian" className={inputStyle} value={financialGuardian} onChange={e => setFinancialGuardian(e.target.value as NonNullable<Student['financialGuardian']>)} disabled={isSubmitting}><option value="mae">Mãe</option><option value="pai">Pai</option><option value="outro">Outro</option></select></div>
                        {financialGuardian === 'outro' && (<div><label htmlFor="otherGuardianName" className={labelStyle}>Nome do Responsável Financeiro</label><input type="text" id="otherGuardianName" className={inputStyle} value={otherGuardianName} onChange={e => setOtherGuardianName(e.target.value)} disabled={isSubmitting}/></div>)}
                         <div className="md:col-span-2"><label htmlFor="guardianAddress" className={labelStyle}>Endereço</label><input type="text" id="guardianAddress" className={inputStyle} value={guardianAddress} onChange={e => setGuardianAddress(e.target.value)} disabled={isSubmitting}/></div>
                          <div><label htmlFor="guardianPhone" className={labelStyle}>Telefone do Responsável</label><input type="tel" id="guardianPhone" className={inputStyle} value={guardianPhone} onChange={e => setGuardianPhone(phoneMask(e.target.value))} disabled={isSubmitting} /></div>
                         <div><label htmlFor="guardianMobile" className={labelStyle}>Celular do Responsável</label><input type="tel" id="guardianMobile" className={inputStyle} value={guardianMobile} onChange={e => setGuardianMobile(phoneMask(e.target.value))} disabled={isSubmitting} /></div>
                        <div><label htmlFor="guardianEmail" className={labelStyle}>Email do Responsável</label><input type="email" id="guardianEmail" className={inputStyle} value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} disabled={isSubmitting}/></div>
                        <div>
                            <label htmlFor="guardianCpf" className={labelStyle}>CPF do Responsável</label>
                            <input type="text" id="guardianCpf" className={inputStyle} value={guardianCpf} onChange={e => setGuardianCpf(e.target.value)} disabled={isSubmitting} />
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