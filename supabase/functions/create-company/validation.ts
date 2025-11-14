export const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  
  // Validar dígitos verificadores
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
};

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export interface CreateCompanyRequest {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  cnpj: string;
  phone: string;
}

export const validateRequest = (body: any): CreateCompanyRequest => {
  const { email, password, fullName, companyName, cnpj, phone } = body;

  if (!email || !email.includes('@')) {
    throw new Error('Email inválido');
  }

  if (!password || password.length < 6) {
    throw new Error('Senha deve ter no mínimo 6 caracteres');
  }

  if (!fullName || fullName.trim().length < 3) {
    throw new Error('Nome completo deve ter no mínimo 3 caracteres');
  }

  if (!companyName || companyName.trim().length < 3) {
    throw new Error('Nome da empresa deve ter no mínimo 3 caracteres');
  }

  if (!cnpj) {
    throw new Error('CNPJ é obrigatório');
  }

  if (!validateCNPJ(cnpj)) {
    throw new Error('CNPJ inválido');
  }

  if (!phone || phone.length < 10) {
    throw new Error('Telefone inválido');
  }

  return { email, password, fullName, companyName, cnpj, phone };
};
