export type OrderStatus = 
  | 'PENDENTE'    // Pedido Realizado: Cliente solicitou o produto, aguardando aceitação da empresa
  | 'ACEITO'      // Pedido Aceito - Aguardando Motorista: Empresa aceitou o pedido, disponível para todos os motoristas online
  | 'EM_PREPARO'  // Em Preparo: Pedido está sendo preparado (opcional)
  | 'A_CAMINHO'   // Em Rota de Entrega: Motorista aceitou e está a caminho do cliente
  | 'NA_PORTA'    // Na Porta: Motorista chegou no local de entrega
  | 'ENTREGUE'    // Entrega Concluída: Pedido foi entregue com sucesso ao cliente
  | 'CANCELADO';  // Entrega Cancelada: Pedido foi cancelado pela empresa

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDENTE: ['ACEITO', 'CANCELADO'],
  ACEITO: ['EM_PREPARO', 'A_CAMINHO', 'CANCELADO'], // Pode ir direto para A_CAMINHO quando motorista aceita
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
  PENDENTE: 'Pedido Realizado',
  ACEITO: 'Aguardando Motorista',
  EM_PREPARO: 'Em Preparo',
  A_CAMINHO: 'Em Rota de Entrega',
  NA_PORTA: 'Chegou no Local',
  ENTREGUE: 'Entrega Concluída',
  CANCELADO: 'Cancelado',
};

export const getStatusLabel = (status: string): string => {
  return STATUS_LABELS[status as OrderStatus] || status;
};
