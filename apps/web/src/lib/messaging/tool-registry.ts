import type { InboxToolName, ToolPolicyDecision } from './contracts.ts'
import { getToolPolicy } from './policy.ts'

export type InboxToolCategory =
  | 'read_only'
  | 'prepare_mutation'
  | 'confirm_mutation'
  | 'human_handoff'
  | 'staff_only'
  | 'restricted'

export interface InboxToolDefinition {
  name: InboxToolName
  category: InboxToolCategory
  description: string
  policy: ToolPolicyDecision
  requiresCustomerConfirmation: boolean
  requiresStaffApproval: boolean
}

const TOOL_REGISTRY: Record<
  InboxToolName,
  Omit<InboxToolDefinition, 'name' | 'policy'>
> = {
  get_business_info: {
    category: 'read_only',
    description: 'Legge informazioni base del business senza mutare dati.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: false,
  },
  get_services: {
    category: 'read_only',
    description: 'Legge catalogo servizi e relative note descrittive.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: false,
  },
  get_prices: {
    category: 'read_only',
    description: 'Legge prezzi e condizioni esposte dal tenant.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: false,
  },
  get_working_hours: {
    category: 'read_only',
    description: 'Legge orari e disponibilita informative del tenant.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: false,
  },
  search_availability: {
    category: 'read_only',
    description: 'Legge disponibilita consultiva senza creare appuntamenti.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: false,
  },
  prepare_appointment: {
    category: 'prepare_mutation',
    description: 'Prepara una proposta di prenotazione senza confermarla.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: false,
  },
  confirm_appointment: {
    category: 'confirm_mutation',
    description: 'Conferma una prenotazione solo con esplicita conferma cliente.',
    requiresCustomerConfirmation: true,
    requiresStaffApproval: false,
  },
  prepare_reschedule: {
    category: 'prepare_mutation',
    description: 'Prepara un cambio appuntamento senza applicarlo.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: false,
  },
  confirm_reschedule: {
    category: 'confirm_mutation',
    description: 'Conferma uno spostamento solo con conferma cliente.',
    requiresCustomerConfirmation: true,
    requiresStaffApproval: false,
  },
  prepare_cancellation: {
    category: 'prepare_mutation',
    description: 'Prepara un annullamento senza applicarlo.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: false,
  },
  confirm_cancellation: {
    category: 'confirm_mutation',
    description: 'Conferma un annullamento solo con conferma cliente.',
    requiresCustomerConfirmation: true,
    requiresStaffApproval: false,
  },
  get_loyalty_summary: {
    category: 'read_only',
    description: 'Legge saldo punti o stato loyalty del cliente.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: false,
  },
  request_human_handoff: {
    category: 'human_handoff',
    description: 'Richiede passaggio a umano senza mutazioni di business.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: false,
  },
  add_internal_note: {
    category: 'staff_only',
    description: 'Scrive una nota interna visibile solo allo staff tenant-scoped.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: true,
  },
  apply_discount: {
    category: 'restricted',
    description: 'Applica uno sconto e richiede approvazione ownership elevata.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: true,
  },
  waive_penalty: {
    category: 'restricted',
    description: 'Rimuove penali e richiede approvazione ownership elevata.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: true,
  },
  refund: {
    category: 'restricted',
    description: 'Gestisce rimborsi, mai consentiti in automatico all AI.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: true,
  },
  delete_customer: {
    category: 'restricted',
    description: 'Cancella dati cliente, sempre negato ad automazioni AI.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: true,
  },
  change_role: {
    category: 'restricted',
    description: 'Modifica ruoli o permessi staff, sempre negato ad automazioni AI.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: true,
  },
  bulk_campaign: {
    category: 'restricted',
    description: 'Avvia campagne massive, sempre negato ad automazioni AI.',
    requiresCustomerConfirmation: false,
    requiresStaffApproval: true,
  },
}

export function getInboxToolDefinition(toolName: InboxToolName): InboxToolDefinition {
  return {
    name: toolName,
    policy: getToolPolicy(toolName),
    ...TOOL_REGISTRY[toolName],
  }
}

export function listInboxToolDefinitions(): InboxToolDefinition[] {
  return Object.keys(TOOL_REGISTRY)
    .map((toolName) => getInboxToolDefinition(toolName as InboxToolName))
}

export function listInboxToolsByPolicy(policy: ToolPolicyDecision): InboxToolDefinition[] {
  return listInboxToolDefinitions().filter((tool) => tool.policy === policy)
}
