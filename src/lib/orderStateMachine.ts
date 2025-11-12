export type OrderStatus = 
  | 'PENDENTE' 
  | 'ACEITO' 
  | 'EM_PREPARO' 
  | 'A_CAMINHO' 
  | 'NA_PORTA' 
  | 'ENTREGA_PENDENTE'
  | 'ENTREGUE' 
  | 'CANCELADO';

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDENTE: ['ACEITO', 'CANCELADO'],
  ACEITO: ['EM_PREPARO', 'CANCELADO'],
  EM_PREPARO: ['A_CAMINHO', 'CANCELADO'],
  A_CAMINHO: ['NA_PORTA', 'CANCELADO'],
  NA_PORTA: ['ENTREGUE', 'ENTREGA_PENDENTE'],
  ENTREGA_PENDENTE: ['ENTREGUE', 'CANCELADO'],
  ENTREGUE: [], // Estado final
  CANCELADO: [], // Estado final
};

export const canTransitionTo = (
  currentStatus: OrderStatus, 
  newStatus: OrderStatus
): boolean => {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
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
  PENDENTE: 'Pendente',
  ACEITO: 'Aceito',
  EM_PREPARO: 'Em Preparo',
  A_CAMINHO: 'A Caminho',
  NA_PORTA: 'Na Porta',
  ENTREGA_PENDENTE: 'Entrega Pendente',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const getStatusLabel = (status: string): string => {
  return STATUS_LABELS[status as OrderStatus] || status;
};
