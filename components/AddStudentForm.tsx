import React, { useState } from 'react';
import { Student } from '../types';
import { ArrowLeftIcon } from './Icons';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

interface AddStudentFormProps {
    onBack: () => void;
    studentToEdit?: Student;
}

const inputStyle = "w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-shadow";
const labelStyle = "block text-sm font-medium text-zinc-600 mb-1";

const gradeOptions = [
    '1º Ano - Fundamental', '2º Ano - Fundamental', '3º Ano - Fundamental', '4º Ano - Fundamental', '5º Ano - Fundamental',
    '6º Ano - Fundamental', '7º Ano - Fundamental', '8º Ano - Fundamental', '9º Ano - Fundamental',
    '1º Ano - Médio', '2º Ano - Médio', '3º Ano - Médio',
    'Pré-vestibular', 'Superior', 'Outro'
];

const AddStudentForm: React.FC<AddStudentFormProps> = ({ onBack, studentToEdit }) => {
    const isEditing = !!studentToEdit;
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [status, setStatus] = useState(studentToEdit?.status || 'prospeccao');
    const [grade, setGrade] = useState(studentToEdit?.grade || '');
    const [financialGuardian, setFinancialGuardian] = useState(studentToEdit?.financialGuardian || 'mae');
    const [objective, setObjective] = useState(studentToEdit?.objective || '');
    const [fullName, setFullName] = useState(studentToEdit?.name || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim() || !objective.trim()) {
            alert('Por favor, preencha os campos obrigatórios: Nome Completo e Principal Objetivo.');
            return;
        }
        setIsSubmitting(true);

        const formData = new FormData(e.target as HTMLFormElement);
        const formProps = Object.fromEntries(formData.entries());

        const studentData = {
          name: formProps.fullName as string,
          guardian: formProps.motherName as string || formProps.fatherName as string || formProps.otherGuardianName as string,
          school: formProps.school as string,
          grade: formProps.grade as string === 'Outro' ? formProps.otherGrade as string : formProps.grade as string,
          status: formProps.status as Student['status'],
          credits: studentToEdit?.credits ?? 0,
          hasMonthlyPlan: studentToEdit?.hasMonthlyPlan ?? false,
          birthDate: formProps.birthDate as string,
          schoolUnit: formProps.schoolUnit as string,
          neurodiversity: formProps.neurodiversity as string,
          objective: formProps.objective as string,
          phone: formProps.phone as string,
          email: formProps.email as string,
          schoolLogin: formProps.schoolLogin as string,
          schoolPassword: formProps.schoolPassword as string,
          didacticMaterial: formProps.didacticMaterial as string,
          medications: formProps.medications as string,
          motherName: formProps.motherName as string,
          fatherName: formProps.fatherName as string,
          financialGuardian: formProps.financialGuardian as Student['financialGuardian'],
          otherGuardianName: formProps.otherGuardianName as string,
          guardianAddress: formProps.guardianAddress as string,
          guardianPhone: formProps.guardianPhone as string,
          guardianMobile: formProps.guardianMobile as string,
          guardianEmail: formProps.guardianEmail as string,
          guardianCpf: formProps.guardianCpf as string,
        };

        try {
            if (isEditing) {
                const studentRef = doc(db, "students", studentToEdit.id);
                await updateDoc(studentRef, studentData);
            } else {
                await addDoc(collection(db, "students"), studentData);
            }
            alert(isEditing ? 'Dados do aluno atualizados com sucesso!' : 'Aluno cadastrado com sucesso!');
            onBack();
        } catch (error) {
            console.error("Error saving student:", error);
            alert("Ocorreu um erro ao salvar o aluno.");
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
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="status" value="prospeccao" checked={status === 'prospeccao'} onChange={(e) => setStatus(e.target.value as Student['status'])} className="h-4 w-4 text-secondary focus:ring-secondary" /> <span className="font-medium text-zinc-700">Prospecção</span></label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="status" value="matricula" checked={status === 'matricula'} onChange={(e) => setStatus(e.target.value as Student['status'])} className="h-4 w-4 text-secondary focus:ring-secondary" /> <span className="font-medium text-zinc-700">Matrícula</span></label>
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Dados do Aluno</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="md:col-span-2"><label htmlFor="fullName" className={labelStyle}>Nome Completo <span className="text-red-500">*</span></label><input type="text" id="fullName" name="fullName" className={inputStyle} required value={fullName} onChange={e => setFullName(e.target.value)} defaultValue={studentToEdit?.name}/></div>
                        <div><label htmlFor="birthDate" className={labelStyle}>Data de Nascimento</label><input type="date" id="birthDate" name="birthDate" className={inputStyle} defaultValue={studentToEdit?.birthDate}/></div>
                        <div><label htmlFor="school" className={labelStyle}>Colégio</label><input type="text" id="school" name="school" className={inputStyle} defaultValue={studentToEdit?.school}/></div>
                        <div><label htmlFor="schoolUnit" className={labelStyle}>Unidade</label><input type="text" id="schoolUnit" name="schoolUnit" className={inputStyle} defaultValue={studentToEdit?.schoolUnit}/></div>
                        <div><label htmlFor="grade" className={labelStyle}>Ano/Série</label><select id="grade" name="grade" className={inputStyle} value={grade} onChange={e => setGrade(e.target.value)}><option value="">Selecione...</option>{gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                        {grade === 'Outro' && (<div><label htmlFor="otherGrade" className={labelStyle}>Qual?</label><input type="text" id="otherGrade" name="otherGrade" className={inputStyle} placeholder="Digite a série" /></div>)}
                        <div className="md:col-span-2"><label htmlFor="neurodiversity" className={labelStyle}>Neurodivergência/Deficiências/Limitações</label><textarea id="neurodiversity" name="neurodiversity" rows={3} className={inputStyle} defaultValue={studentToEdit?.neurodiversity}></textarea></div>
                         <div className="md:col-span-2"><label htmlFor="objective" className={labelStyle}>Principal Objetivo <span className="text-red-500">*</span></label><input type="text" id="objective" name="objective" className={inputStyle} required value={objective} onChange={e => setObjective(e.target.value)} defaultValue={studentToEdit?.objective}/></div>
                        <div><label htmlFor="phone" className={labelStyle}>Telefone</label><input type="tel" id="phone" name="phone" className={inputStyle} defaultValue={studentToEdit?.phone}/></div>
                        <div><label htmlFor="email" className={labelStyle}>Email</label><input type="email" id="email" name="email" className={inputStyle} defaultValue={studentToEdit?.email}/></div>
                         <div><label htmlFor="schoolLogin" className={labelStyle}>Login do Sistema da Escola</label><input type="text" id="schoolLogin" name="schoolLogin" className={inputStyle} defaultValue={studentToEdit?.schoolLogin}/></div>
                         <div><label htmlFor="schoolPassword" className={labelStyle}>Senha do Sistema da Escola</label><input type="text" id="schoolPassword" name="schoolPassword" className={inputStyle} defaultValue={studentToEdit?.schoolPassword}/></div>
                         <div className="md:col-span-2"><label htmlFor="didacticMaterial" className={labelStyle}>Material Didático/Editora</label><input type="text" id="didacticMaterial" name="didacticMaterial" className={inputStyle} defaultValue={studentToEdit?.didacticMaterial}/></div>
                        <div className="md:col-span-2"><label htmlFor="medications" className={labelStyle}>Medicamentos e Instruções</label><textarea id="medications" name="medications" rows={3} className={inputStyle} defaultValue={studentToEdit?.medications}></textarea></div>
                    </div>
                </fieldset>
                
                 <fieldset>
                    <legend className="text-lg font-semibold text-zinc-700 border-b pb-2 mb-4">Dados dos Responsáveis</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div><label htmlFor="motherName" className={labelStyle}>Nome da Mãe</label><input type="text" id="motherName" name="motherName" className={inputStyle} defaultValue={studentToEdit?.motherName}/></div>
                         <div><label htmlFor="fatherName" className={labelStyle}>Nome do Pai</label><input type="text" id="fatherName" name="fatherName" className={inputStyle} defaultValue={studentToEdit?.fatherName}/></div>
                         <div><label htmlFor="financialGuardian" className={labelStyle}>Responsável Financeiro</label><select id="financialGuardian" name="financialGuardian" className={inputStyle} value={financialGuardian} onChange={e => setFinancialGuardian(e.target.value as NonNullable<Student['financialGuardian']>)}><option value="mae">Mãe</option><option value="pai">Pai</option><option value="outro">Outro</option></select></div>
                        {financialGuardian === 'outro' && (<div><label htmlFor="otherGuardianName" className={labelStyle}>Nome do Responsável Financeiro</label><input type="text" id="otherGuardianName" name="otherGuardianName" className={inputStyle} defaultValue={studentToEdit?.otherGuardianName}/></div>)}
                         <div className="md:col-span-2"><label htmlFor="guardianAddress" className={labelStyle}>Endereço</label><input type="text" id="guardianAddress" name="guardianAddress" className={inputStyle} defaultValue={studentToEdit?.guardianAddress}/></div>
                          <div><label htmlFor="guardianPhone" className={labelStyle}>Telefone do Responsável</label><input type="tel" id="guardianPhone" name="guardianPhone" className={inputStyle} defaultValue={studentToEdit?.guardianPhone}/></div>
                         <div><label htmlFor="guardianMobile" className={labelStyle}>Celular do Responsável</label><input type="tel" id="guardianMobile" name="guardianMobile" className={inputStyle} defaultValue={studentToEdit?.guardianMobile}/></div>
                        <div><label htmlFor="guardianEmail" className={labelStyle}>Email do Responsável</label><input type="email" id="guardianEmail" name="guardianEmail" className={inputStyle} defaultValue={studentToEdit?.guardianEmail}/></div>
                        <div><label htmlFor="guardianCpf" className={labelStyle}>CPF do Responsável</label><input type="text" id="guardianCpf" name="guardianCpf" className={inputStyle} defaultValue={studentToEdit?.guardianCpf}/></div>
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
