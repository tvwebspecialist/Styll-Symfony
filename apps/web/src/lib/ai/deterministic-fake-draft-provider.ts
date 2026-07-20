import type {
  AiDraftIntent,
  AiDraftMessage,
  AiDraftProvider,
  AiDraftRequest,
  AiDraftResponse,
} from './draft-provider.ts'

function findSection(
  input: AiDraftRequest,
  key: 'services' | 'tenant_profile' | 'working_hours',
): string {
  return input.contextSections.find((section) => section.key === key)?.text ?? ''
}

function findSourceRefsByPrefix(input: AiDraftRequest, prefix: string): string[] {
  return input.sources
    .filter((source) => source.ref.startsWith(prefix))
    .map((source) => source.ref)
}

function getLatestMessage(
  input: AiDraftRequest,
  author?: AiDraftMessage['author'],
): AiDraftMessage | null {
  const messages = author
    ? input.messages.filter((message) => message.author === author)
    : input.messages

  return messages.at(-1) ?? null
}

function readTenantBusinessName(input: AiDraftRequest): string {
  const tenantProfile = findSection(input, 'tenant_profile')
  const businessNameLine = tenantProfile
    .split('\n')
    .find((line) => line.startsWith('business_name='))

  return businessNameLine?.slice('business_name='.length).trim() || 'il salone'
}

function shouldReferenceWorkingHours(text: string): boolean {
  return /(orari|apert|chiud|domani|oggi)/i.test(text)
}

function shouldReferenceServices(text: string): boolean {
  return /(prezz|cost|quanto|serviz|taglio|barba)/i.test(text)
}

function shouldPrepareAppointment(text: string): boolean {
  return /(appunt|prenot|domani|oggi)/i.test(text)
}

function shouldRescheduleAppointment(text: string): boolean {
  return /(spost|cambi|riprogram|rimand|posticip|anticip)/i.test(text)
}

function shouldCancelAppointment(text: string): boolean {
  return /(annull|disdi|cancell)/i.test(text)
}

function shouldEscalateToHuman(text: string): boolean {
  return /(operatore|persona|umano)/i.test(text)
}

function isComplaint(text: string): boolean {
  return /(problema|male|pessim|delus|reclamo|lament|disservizio|arrabbi)/i.test(text)
}

function isGreeting(text: string): boolean {
  return /^(ciao|salve|buongiorno|buonasera|hey)\b/i.test(text.trim())
}

function isUnclear(text: string): boolean {
  const normalized = text.trim()

  return (
    normalized.length < 5
    || /^[?!.\s]+$/.test(normalized)
    || /^(ci siete|mi aiutate|boh|help)\??$/i.test(normalized)
  )
}

function classifyIntent(text: string): AiDraftIntent {
  if (isGreeting(text)) return 'greeting'
  if (isUnclear(text)) return 'unknown'
  if (isComplaint(text)) return 'complaint'
  if (shouldEscalateToHuman(text)) return 'human_request'
  if (shouldCancelAppointment(text)) return 'appointment_cancel'
  if (shouldRescheduleAppointment(text)) return 'appointment_change'
  if (shouldPrepareAppointment(text)) return 'appointment_booking'
  if (shouldReferenceServices(text)) return 'pricing'
  if (shouldReferenceWorkingHours(text)) return 'opening_hours'
  if (text.trim().length > 0) return 'faq'
  return 'unknown'
}

function buildDraftText(input: AiDraftRequest, intent: AiDraftIntent): string {
  const businessName = readTenantBusinessName(input)
  const workingHoursSummary = findSection(input, 'working_hours')
    .split('\n')
    .find(Boolean)
  const servicesSummary = findSection(input, 'services')
    .split('\n')
    .find(Boolean)

  switch (intent) {
    case 'human_request':
      return `Ciao, grazie per aver scritto a ${businessName}. Giro subito la conversazione a un operatore umano cosi puo aiutarti direttamente.`
    case 'complaint':
      return `Ciao, grazie per averci segnalato la situazione. Preferisco far verificare subito il caso a un operatore del team cosi possiamo risponderti con precisione.`
    case 'pricing':
      if (servicesSummary) {
        return `Ciao, grazie per il messaggio. Il riferimento piu vicino che abbiamo nel contesto e: ${servicesSummary.replace(/^- /, '')}. Se ti serve una conferma puntuale, faccio verificare allo staff prima dell'invio.`
      }
      return 'Ciao, grazie per il messaggio. Non ho un riferimento prezzo affidabile nel contesto disponibile, quindi farei verificare allo staff prima di risponderti.'
    case 'opening_hours':
      if (workingHoursSummary) {
        return `Ciao, grazie per averci scritto. Dagli orari disponibili risulta: ${workingHoursSummary.replace(/^- /, '')}. Se vuoi, posso far verificare allo staff eventuali eccezioni prima dell'invio.`
      }
      return 'Ciao, grazie per il messaggio. Non ho un riferimento orario completo nel contesto disponibile, quindi preferisco far verificare allo staff.'
    case 'appointment_booking':
      return `Ciao, grazie per aver scritto a ${businessName}. Posso preparare una proposta di appuntamento da far confermare manualmente allo staff prima dell'invio.`
    case 'appointment_change':
      return `Ciao, grazie per averci scritto. Posso preparare una proposta di spostamento appuntamento, ma prima va verificata dallo staff.`
    case 'appointment_cancel':
      return `Ciao, grazie per il messaggio. Posso preparare una bozza per la cancellazione, ma preferisco farla confermare allo staff prima dell'invio.`
    case 'greeting':
      return `Ciao, grazie per aver scritto a ${businessName}. Dimmi pure come posso aiutarti e preparo una risposta da far verificare allo staff prima dell'invio.`
    case 'faq':
      return `Ciao, grazie per aver scritto a ${businessName}. Preparo una risposta chiara usando solo le informazioni disponibili e, se manca qualcosa, la faccio verificare allo staff.`
    case 'unknown':
    default:
      return `Ciao, grazie per aver scritto a ${businessName}. Il contesto disponibile non basta per una risposta affidabile, quindi chiederei una verifica allo staff prima dell'invio.`
  }
}

function buildReasoning(intent: AiDraftIntent): string {
  switch (intent) {
    case 'pricing':
      return 'La richiesta riguarda prezzi o servizi e deve usare solo listino presente nel contesto.'
    case 'opening_hours':
      return 'La richiesta riguarda orari e richiede solo riferimenti presenti nella sezione working hours.'
    case 'appointment_booking':
      return 'La richiesta sembra una prenotazione; e ammesso solo un suggerimento preparatorio senza conferma automatica.'
    case 'appointment_change':
      return 'La richiesta sembra uno spostamento appuntamento; serve conferma umana prima di inviare dettagli.'
    case 'appointment_cancel':
      return 'La richiesta sembra una cancellazione; va trattata come bozza conservativa con revisione umana.'
    case 'human_request':
      return 'Il cliente chiede esplicitamente una persona del team.'
    case 'complaint':
      return 'Il tono suggerisce un reclamo o un problema e richiede handoff umano.'
    case 'greeting':
      return 'Il messaggio e principalmente un saluto iniziale.'
    case 'faq':
      return 'La richiesta sembra informativa ma non abbastanza specifica da richiedere tool mutativi.'
    case 'unknown':
    default:
      return 'Il messaggio non e abbastanza chiaro per una risposta affidabile senza verifica umana.'
  }
}

function buildConfidence(intent: AiDraftIntent): number {
  switch (intent) {
    case 'human_request':
    case 'complaint':
      return 0.92
    case 'pricing':
    case 'opening_hours':
    case 'appointment_booking':
      return 0.84
    case 'appointment_change':
    case 'appointment_cancel':
      return 0.8
    case 'greeting':
      return 0.76
    case 'faq':
      return 0.62
    case 'unknown':
    default:
      return 0.45
  }
}

export const deterministicFakeDraftProvider: AiDraftProvider = {
  providerId: 'deterministic_fake_draft_v1',
  async generateDraft(input: AiDraftRequest): Promise<AiDraftResponse> {
    const latestCustomerMessage = getLatestMessage(input, 'customer')
    const latestAnyMessage = getLatestMessage(input)
    const latestText = latestCustomerMessage?.text ?? latestAnyMessage?.text ?? ''
    const intent = classifyIntent(latestText)
    const citedSources = new Set<string>()
    const requestedToolCalls: AiDraftResponse['requestedToolCalls'] = []

    if (latestCustomerMessage?.sourceRef) {
      citedSources.add(latestCustomerMessage.sourceRef)
    }

    if (shouldReferenceWorkingHours(latestText)) {
      for (const ref of findSourceRefsByPrefix(input, 'working_hours:').slice(0, 2)) {
        citedSources.add(ref)
      }
    }

    if (shouldReferenceServices(latestText)) {
      for (const ref of findSourceRefsByPrefix(input, 'service:').slice(0, 2)) {
        citedSources.add(ref)
      }
    }

    if (citedSources.size === 0) {
      citedSources.add('tenant:' + input.tenantId + ':profile')
    }

    if (intent === 'human_request' || intent === 'complaint') {
      requestedToolCalls.push({
        name: 'request_human_handoff',
        arguments: {
          reason: intent === 'complaint' ? 'customer_complaint' : 'customer_requested_human',
        },
      })
    } else if (intent === 'appointment_booking') {
      requestedToolCalls.push({
        name: 'prepare_appointment',
        arguments: {
          source: 'draft_only_advisory',
        },
      })
    } else if (intent === 'appointment_change') {
      requestedToolCalls.push({
        name: 'prepare_reschedule',
        arguments: {
          source: 'draft_only_advisory',
        },
      })
    } else if (intent === 'appointment_cancel') {
      requestedToolCalls.push({
        name: 'prepare_cancellation',
        arguments: {
          source: 'draft_only_advisory',
        },
      })
    }

    return {
      draftText: buildDraftText(input, intent),
      confidence: buildConfidence(intent),
      intent,
      handoff: intent === 'human_request' || intent === 'complaint' || intent === 'unknown',
      internalReasoning: buildReasoning(intent),
      citedSources: [...citedSources],
      requestedToolCalls,
      providerRunId: `local-draft:${input.conversationId}:${input.promptVersion}`,
    }
  },
}
