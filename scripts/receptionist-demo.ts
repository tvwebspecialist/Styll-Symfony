import { stdin as input, stdout as output } from 'node:process'
import readline from 'node:readline/promises'

import { buildInboxDraftRequest } from '../apps/web/src/lib/ai/inbox-draft-context-core.ts'
import { deterministicFakeAvailabilityGateway } from '../apps/web/src/lib/ai/deterministic-fake-availability-gateway.ts'
import { generateInboxDraftCore } from '../apps/web/src/lib/ai/inbox-draft-orchestrator-core.ts'
import {
  resolveConfiguredInboxDraftProvider,
  resolveInboxDraftProviderLabel,
} from '../apps/web/src/lib/ai/inbox-draft-provider-selection.ts'

type DemoTenantFixture = {
  key: string
  businessName: string
  timezone: string
  tagline: string
  description: string
  services: Array<{
    id: string
    name: string
    description: string
    price: number | null
    durationMinutes: number
    displayOrder: number
  }>
  workingHours: Array<{
    id: string
    dayOfWeek: number
    startTime: string
    endTime: string
  }>
  customFaqs: Array<{
    topic:
      | 'payment_methods'
      | 'parking'
      | 'late_arrival'
      | 'cancellation_policy'
      | 'accessibility'
      | 'location_instructions'
    answer: string
    enabled: boolean
  }>
}

const TENANT_FIXTURES: DemoTenantFixture[] = [
  {
    key: 'barber-house',
    businessName: 'Barber House',
    timezone: 'Europe/Rome',
    tagline: 'Tagli puliti e barba precisa',
    description: 'Barber shop di quartiere con prenotazione via WhatsApp.',
    services: [
      {
        id: 'service-1',
        name: 'Taglio',
        description: 'Taglio classico uomo',
        price: 25,
        durationMinutes: 30,
        displayOrder: 1,
      },
      {
        id: 'service-2',
        name: 'Barba',
        description: 'Rifinitura completa',
        price: 15,
        durationMinutes: 20,
        displayOrder: 2,
      },
    ],
    workingHours: [
      { id: 'wh-1', dayOfWeek: 1, startTime: '09:00:00', endTime: '13:00:00' },
      { id: 'wh-2', dayOfWeek: 1, startTime: '14:00:00', endTime: '18:00:00' },
      { id: 'wh-3', dayOfWeek: 2, startTime: '09:00:00', endTime: '18:00:00' },
      { id: 'wh-4', dayOfWeek: 3, startTime: '09:00:00', endTime: '18:00:00' },
      { id: 'wh-5', dayOfWeek: 4, startTime: '09:00:00', endTime: '18:00:00' },
      { id: 'wh-6', dayOfWeek: 5, startTime: '09:00:00', endTime: '18:00:00' },
      { id: 'wh-7', dayOfWeek: 6, startTime: '09:00:00', endTime: '14:00:00' },
    ],
    customFaqs: [
      { topic: 'payment_methods', answer: 'Accettiamo contanti, carte e Satispay.', enabled: true },
      { topic: 'parking', answer: 'C e un parcheggio convenzionato in via Verdi 12.', enabled: true },
      { topic: 'cancellation_policy', answer: 'Ti chiediamo di avvisarci con almeno 24 ore di anticipo.', enabled: true },
    ],
  },
  {
    key: 'studio-glow',
    businessName: 'Studio Glow',
    timezone: 'Europe/Rome',
    tagline: 'Piega, colore e trattamenti su misura',
    description: 'Salone beauty con servizi donna e styling personalizzato.',
    services: [
      {
        id: 'service-1',
        name: 'Piega',
        description: 'Piega classica',
        price: 22,
        durationMinutes: 35,
        displayOrder: 1,
      },
      {
        id: 'service-2',
        name: 'Colore',
        description: 'Colorazione base',
        price: 55,
        durationMinutes: 90,
        displayOrder: 2,
      },
    ],
    workingHours: [
      { id: 'wh-1', dayOfWeek: 1, startTime: '10:00:00', endTime: '19:00:00' },
      { id: 'wh-2', dayOfWeek: 2, startTime: '10:00:00', endTime: '19:00:00' },
      { id: 'wh-3', dayOfWeek: 3, startTime: '10:00:00', endTime: '19:00:00' },
      { id: 'wh-4', dayOfWeek: 4, startTime: '10:00:00', endTime: '20:00:00' },
      { id: 'wh-5', dayOfWeek: 5, startTime: '10:00:00', endTime: '20:00:00' },
      { id: 'wh-6', dayOfWeek: 6, startTime: '09:00:00', endTime: '15:00:00' },
    ],
    customFaqs: [
      { topic: 'payment_methods', answer: 'Accettiamo contanti e carte principali.', enabled: true },
      { topic: 'late_arrival', answer: 'Se arrivi con oltre 15 minuti di ritardo potremmo dover ripianificare.', enabled: true },
      { topic: 'accessibility', answer: 'Il salone e al piano strada.', enabled: true },
    ],
  },
]

const DEMO_START = new Date('2026-07-20T09:00:00.000Z')

function printBanner() {
  output.write([
    'AI Receptionist Demo',
    'Comandi: /reset, /state, /transcript, /tenant, /quit',
    'Provider: usa INBOX_AI_PROVIDER=fake|anthropic e ANTHROPIC_API_KEY quando necessario.',
    'Availability gateway: demo CLI forzata sul fake deterministico per restare eseguibile fuori dal runtime web.',
    '',
  ].join('\n'))
}

function parseArg(name: string): string | null {
  const direct = process.argv.find((entry) => entry.startsWith(`--${name}=`))
  if (direct) {
    return direct.slice(name.length + 3)
  }

  const index = process.argv.findIndex((entry) => entry === `--${name}`)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

function nextIsoTimestamp(counter: number): string {
  return new Date(DEMO_START.getTime() + counter * 60_000).toISOString()
}

function printJson(label: string, value: unknown) {
  output.write(`${label}\n${JSON.stringify(value, null, 2)}\n\n`)
}

async function chooseTenant(rl: readline.Interface): Promise<DemoTenantFixture> {
  const requested = parseArg('tenant')
  if (requested) {
    const match = TENANT_FIXTURES.find((fixture) => fixture.key === requested)
    if (match) return match
  }

  output.write('Tenant fixtures disponibili:\n')
  TENANT_FIXTURES.forEach((fixture, index) => {
    output.write(`${index + 1}. ${fixture.key} (${fixture.businessName})\n`)
  })

  while (true) {
    const answer = (await rl.question('Seleziona tenant: ')).trim()
    const byIndex = Number(answer)
    if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= TENANT_FIXTURES.length) {
      return TENANT_FIXTURES[byIndex - 1]
    }

    const byKey = TENANT_FIXTURES.find((fixture) => fixture.key === answer)
    if (byKey) return byKey
  }
}

async function main() {
  const rl = readline.createInterface({ input, output })
  printBanner()

  let tenant = await chooseTenant(rl)
  let provider = resolveConfiguredInboxDraftProvider(process.env)
  let transcript: Array<{
    id: string
    authorKind: 'assistant' | 'customer'
    bodyText: string
    createdAt: string
  }> = []
  let messageCounter = 0

  function resetConversation() {
    transcript = []
    messageCounter = 0
  }

  async function runTurn(customerText: string) {
    messageCounter += 1
    transcript.push({
      id: `message-${messageCounter}`,
      authorKind: 'customer',
      bodyText: customerText,
      createdAt: nextIsoTimestamp(messageCounter - 1),
    })

    const request = buildInboxDraftRequest({
      tenantId: tenant.key,
      conversationId: 'demo-conversation',
      conversation: {
        id: 'demo-conversation',
        tenantId: tenant.key,
        status: 'ai_draft_only',
        ownershipMode: 'hybrid',
        aiPausedAt: null,
        clientId: 'demo-client',
      },
      tenant: {
        id: tenant.key,
        businessName: tenant.businessName,
        tagline: tenant.tagline,
        description: tenant.description,
        timezone: tenant.timezone,
        receptionistConfig: {
          mode: 'supervised',
          autoReplyConfidenceThreshold: 0.75,
          handoffConfidenceThreshold: 0.65,
          allowedAutonomousIntents: ['greeting', 'pricing', 'opening_hours', 'faq'],
          preferredTone: 'caldo e professionale',
          greetingStyle: 'breve e naturale',
          escalationInstructions: null,
          customFaqs: tenant.customFaqs,
        },
      },
      services: tenant.services,
      workingHours: tenant.workingHours,
      messages: transcript,
    })

    const result = await generateInboxDraftCore(
      {
        tenantId: tenant.key,
        conversationId: 'demo-conversation',
      },
      {
        async loadDraftRequest() {
          return request
        },
        provider,
        availabilityGateway: deterministicFakeAvailabilityGateway,
        async createRun() {
          return { runId: `demo-run-${messageCounter}` }
        },
        async completeRun() {},
        async failRun(input) {
          throw new Error(input.errorMessage)
        },
      },
    )

    messageCounter += 1
    transcript.push({
      id: `message-${messageCounter}`,
      authorKind: 'assistant',
      bodyText: result.draftText,
      createdAt: nextIsoTimestamp(messageCounter - 1),
    })

    output.write(`\nAI (${resolveInboxDraftProviderLabel(result.providerId)}): ${result.draftText}\n\n`)
    printJson('Conversation', transcript)
    printJson('Conversation State', result.receptionistState)
    printJson('Availability Result', result.availabilityResult)
    printJson('Suggested Slots', result.availabilityResult?.suggestedSlots ?? [])
    printJson('Prepared Tool Advisory', result.decision.appointmentPreparation?.preparedToolCall ?? null)
    printJson('Draft', {
      text: result.draftText,
      decision: result.decision.reasonCode,
    })
  }

  while (true) {
    const answer = (await rl.question(`${tenant.businessName}> `)).trim()

    if (answer === '/quit' || answer === '/exit') {
      break
    }

    if (answer === '/reset') {
      resetConversation()
      output.write('Conversazione resettata.\n\n')
      continue
    }

    if (answer === '/state') {
      const lastAssistantState = transcript.length === 0
        ? null
        : buildInboxDraftRequest({
            tenantId: tenant.key,
            conversationId: 'demo-conversation',
            conversation: {
              id: 'demo-conversation',
              tenantId: tenant.key,
              status: 'ai_draft_only',
              ownershipMode: 'hybrid',
              aiPausedAt: null,
              clientId: 'demo-client',
            },
            tenant: {
              id: tenant.key,
              businessName: tenant.businessName,
              tagline: tenant.tagline,
              description: tenant.description,
              timezone: tenant.timezone,
              receptionistConfig: {
                mode: 'supervised',
                autoReplyConfidenceThreshold: 0.75,
                handoffConfidenceThreshold: 0.65,
                allowedAutonomousIntents: ['greeting', 'pricing', 'opening_hours', 'faq'],
                preferredTone: 'caldo e professionale',
                greetingStyle: 'breve e naturale',
                escalationInstructions: null,
                customFaqs: tenant.customFaqs,
              },
            },
            services: tenant.services,
            workingHours: tenant.workingHours,
            messages: transcript,
          }).receptionistState

      printJson('Current Deterministic State', lastAssistantState)
      continue
    }

    if (answer === '/transcript') {
      printJson('Transcript', transcript)
      continue
    }

    if (answer === '/tenant') {
      tenant = await chooseTenant(rl)
      provider = resolveConfiguredInboxDraftProvider(process.env)
      resetConversation()
      output.write(`Tenant attivo: ${tenant.businessName}\n\n`)
      continue
    }

    if (answer.length === 0) {
      continue
    }

    await runTurn(answer)
  }

  rl.close()
}

main().catch((error) => {
  output.write(`\nDemo error: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
