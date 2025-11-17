export type OrderStatus = 
  | 'PENDENTE'    // Pedido criado, aguardando aceitação da empresa
  | 'ACEITO'      // Empresa aceitou o pedido
  | 'EM_PREPARO'  // Pedido está sendo preparado
  | 'A_CAMINHO'   // Entregador está a caminho
  | 'NA_PORTA'    // Entregador chegou no local
  | 'ENTREGUE'    // Pedido foi entregue com sucesso
  | 'CANCELADO';  // Pedido foi cancelado

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDENTE: ['ACEITO', 'CANCELADO'],
  ACEITO: ['EM_PREPARO', 'CANCELADO'],
  EM_PREPARO: ['A_CAMINHO', 'CANCELADO'],
  A_CAMINHO: ['NA_PORTA', 'CANCELADO'],
  NA_PORTA: ['ENTREGUE', 'CANCELADO'],
  ENTREGUE: [],    // Estado final, sem transições
  CANCELADO: [],   // Estado final, sem transições
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
  PENDENTE: 'Aguardando Aprovação',
  ACEITO: 'Aceito',
  EM_PREPARO: 'Em Preparo',
  A_CAMINHO: 'A Caminho',
  NA_PORTA: 'Na Porta',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const getStatusLabel = (status: string): string => {
  return STATUS_LABELS[status as OrderStatus] || status;
};
