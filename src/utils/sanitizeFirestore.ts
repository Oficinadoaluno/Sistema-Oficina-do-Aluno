/**
 * Remove todos os caracteres não numéricos de uma string.
 * @param s A string de entrada.
 * @returns Uma string contendo apenas os dígitos.
 */
export const onlyDigits = (s: string | null | undefined): string => {
  if (!s) return '';
  return s.replace(/\D/g, '');
};

/**
 * Aplica uma máscara de telefone (brasileiro) a uma string.
 * @param v A string de entrada.
 * @returns A string formatada como (XX) XXXX-XXXX ou (XX) XXXXX-XXXX.
 */
export const phoneMask = (v: string): string => {
  if (!v) return "";
  let r = v.replace(/\D/g, "");
  r = r.replace(/^0/, "");
  if (r.length > 10) {
    r = r.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3");
  } else if (r.length > 5) {
    r = r.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  } else if (r.length > 2) {
    r = r.replace(/^(\d\d)(\d{0,5}).*/, "($1) $2");
  } else {
    r = r.replace(/^(\d*)/, "($1");
  }
  return r;
};

/**
 * Valida um número de CPF brasileiro.
 * @param cpf A string do CPF (pode conter máscara).
 * @returns `true` se o CPF for válido, `false` caso contrário.
 */
export const validateCPF = (cpf: string): boolean => {
    if (!cpf) return true; // Campo opcional é válido se vazio
    const cpfClean = onlyDigits(cpf);

    if (cpfClean.length !== 11 || /^(\d)\1{10}$/.test(cpfClean)) {
        return false;
    }
    let sum = 0; let remainder;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpfClean.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpfClean.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpfClean.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpfClean.substring(10, 11))) return false;
    return true;
};

/**
 * Remove recursivamente chaves com valores `undefined` de um objeto ou array.
 * Essencial para preparar objetos para o Firestore, que não aceita `undefined`.
 *
 * @template T O tipo do objeto.
 * @param {T} obj O objeto a ser sanitizado.
 * @returns {T} Um novo objeto sem valores `undefined`.
 */
export function sanitizeFirestore<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    // If it's an array, map over its items and sanitize them recursively.
    return obj
      .map(item => sanitizeFirestore(item))
      .filter(item => item !== undefined) as T;
  }

  // If it's an object, create a new object and sanitize its properties.
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as any)[key];
      if (value !== undefined) {
        newObj[key] = sanitizeFirestore(value);
      }
    }
  }
  return newObj as T;
}

/**
 * Retorna o primeiro e o último nome de um nome completo.
 * @param fullName O nome completo.
 * @returns O nome abreviado ou 'N/A' se o nome for nulo.
 */
export const getShortName = (fullName?: string): string => {
  if (!fullName) return 'N/A';
  const names = fullName.trim().split(/\s+/);
  if (names.length <= 1) {
    return fullName;
  }
  return `${names[0]} ${names[names.length - 1]}`;
};
