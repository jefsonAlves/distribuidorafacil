export type OrderStatus = 
  | 'SOLICITADO' 
  | 'ACEITO' 
  | 'PREPARANDO' 
  | 'PRONTO' 
  | 'COLETADO' 
  | 'A_CAMINHO' 
  | 'CHEGOU' 
  | 'ENTREGUE' 
  | 'PENDENTE'
  | 'CANCELADO';

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  SOLICITADO: ['ACEITO', 'CANCELADO'],
  ACEITO: ['PREPARANDO', 'CANCELADO'],
  PREPARANDO: ['PRONTO', 'CANCELADO'],
  PRONTO: ['COLETADO', 'CANCELADO'],
  COLETADO: ['A_CAMINHO', 'CANCELADO'],
  A_CAMINHO: ['CHEGOU', 'CANCELADO', 'PENDENTE'],
  CHEGOU: ['ENTREGUE', 'CANCELADO', 'PENDENTE'],
  ENTREGUE: [], 
  PENDENTE: ['COLETADO', 'A_CAMINHO', 'CHEGOU', 'ENTREGUE', 'CANCELADO'], 
  CANCELADO: [], 
};

export const canTransitionTo = (
  currentStatus: OrderStatus, 
  newStatus: OrderStatus
): boolean => {
  const validTransitions = VALID_TRANSITIONS[currentStatus];
  return validTransitions ? validTransitions.includes(newStatus) : false;
};

export const getNextValidStates = (currentStatus: OrderStatus): OrderStatus[] => {
  return VALID_TRANSITIONS[currentStatus] || [];
};

export const isValidTransition = (
  currentStatus: string, 
  newStatus: string
): boolean => {
  return canTransitionTo(currentStatus as OrderStatus, newStatus as OrderStatus);
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  SOLICITADO: 'Solicitado',
  ACEITO: 'Aceito',
  PREPARANDO: 'Preparando',
  PRONTO: 'Pronto',
  COLETADO: 'Coletado',
  A_CAMINHO: 'A Caminho',
  CHEGOU: 'Chegou no Local',
  ENTREGUE: 'Entregue',
  PENDENTE: 'Pendente',
  CANCELADO: 'Cancelado',
};

export const getStatusLabel = (status: string): string => {
  return STATUS_LABELS[status as OrderStatus] || status;
};
