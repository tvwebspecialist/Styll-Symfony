import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(10_000),
})

const AiutoChatSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
})

const FAQ_CONTEXT = `
🚀 Primo avvio
Q: Come configuro la mia app per la prima volta?
A: Accedi alla dashboard con le credenziali ricevute via email. Il wizard di configurazione ti guida in 5 step: carica il logo, scegli il colore primario, imposta gli orari di apertura, aggiungi i tuoi servizi e invita il team. Puoi saltare qualsiasi step e completarlo dopo da Impostazioni.

Q: Come importo i clienti da Fresha o Booksy?
A: Vai su Clienti → Importa. Esporta il CSV dei tuoi clienti da Fresha o Booksy, poi trascina il file nella zona di upload. Styll mappa automaticamente i campi nome, telefono ed email. Rivedi l'anteprima e conferma: i clienti appaiono subito nella lista.

Q: Come condivido il link della mia app ai clienti?
A: In Impostazioni → La mia App trovi il tuo link personalizzato (es. mario.styll.app). Copialo e invialo via WhatsApp ai tuoi clienti, o usa il pulsante "Genera QR" per stamparlo e tenerlo in salone.

📅 Appuntamenti & Calendario
Q: Come aggiungo un appuntamento manualmente?
A: Dal Calendario, clicca su una fascia oraria libera oppure sul pulsante "+ Nuovo" in alto a destra. Seleziona il cliente (o creane uno al momento), scegli il servizio e conferma. L'appuntamento appare subito nella vista giornaliera.

Q: Come gestisco un walk-in?
A: Clicca su "+ Nuovo" nel calendario e scegli "Walk-in" come tipo di appuntamento. Puoi associarlo a un cliente esistente o lasciarlo anonimo. Utile per tenere traccia dei passaggi e le statistiche del salone.

Q: Come blocco un giorno o un orario?
A: Nel Calendario, clicca sull'orario che vuoi bloccare e scegli "Blocca fascia". Puoi bloccare un'ora singola, un'intera giornata o un intervallo ricorrente (es. pausa pranzo). I clienti non potranno prenotare in quel periodo.

Q: Cosa succede se un cliente cancella?
A: Ricevi una notifica push e il tempo torna disponibile nel calendario. Se hai attivato il promemoria anti no-show, il sistema invia in automatico un messaggio di ri-prenotazione al cliente entro 24 ore dalla cancellazione.

👥 Clienti & CRM
Q: Come aggiungo un cliente nuovo?
A: Vai su Clienti → pulsante "+ Nuovo cliente". Inserisci nome, numero di telefono e (opzionale) email. Puoi anche aggiungere un cliente al volo direttamente dalla schermata di creazione appuntamento.

Q: Dove vedo le note private su un cliente?
A: Apri la scheda cliente cliccando sul suo nome. In basso trovi la sezione "Note private": solo i membri del tuo team le vedono, non sono mai visibili al cliente. Ideale per preferenze su tagli, allergie o note di stile.

Q: Cosa significa il semaforo accanto al nome?
A: Verde = cliente attivo (tornato di recente). Giallo = cliente a rischio (non viene da 4–8 settimane). Rosso = cliente perso (assente da più di 8 settimane). Il semaforo ti aiuta a capire a colpo d'occhio chi ha bisogno di un messaggio win-back.

🎁 Loyalty & Punti
Q: Come assegno punti a un cliente che non ha l'app?
A: Apri la scheda cliente e clicca su "Assegna punti manualmente". Inserisci il numero di punti e un'eventuale nota (es. "taglio + barba"). I punti vengono accreditati subito e il cliente li vedrà quando scarica l'app.

Q: Come riscatto un premio per un cliente?
A: Dalla scheda cliente, nella sezione Loyalty, clicca su "Riscatta premio". Seleziona il premio dal menu e conferma. Il saldo punti viene scalato automaticamente e il cliente riceve una notifica di conferma.

Q: Come cambio le soglie dei premi?
A: Vai su Impostazioni → Loyalty. Da qui puoi modificare il numero di punti necessari per ogni premio, aggiungere nuovi premi o disattivare quelli esistenti. Le modifiche sono attive immediatamente per tutti i clienti.

📣 Messaggi & Win-back
Q: Come invio un messaggio a un cliente che non viene da tempo?
A: Vai su Marketing → Win-back. Styll mostra già la lista dei clienti a rischio e persi. Seleziona uno o più clienti e clicca "Invia messaggio". Puoi usare un template pronto o scrivere un testo personalizzato, inviato via WhatsApp o SMS.

Q: Come funziona il promemoria automatico anti no-show?
A: Il promemoria viene inviato in automatico 24 ore prima dell'appuntamento con un link di conferma. Se il cliente non risponde entro 2 ore dall'appuntamento, ricevi una notifica. Puoi attivarlo o disattivarlo in Impostazioni → Notifiche.

Q: Posso personalizzare il testo dei messaggi?
A: Sì. In Marketing → Messaggi trovi tutti i template attivi. Clicca su un template per modificarlo: puoi cambiare il testo, usare variabili dinamiche come {{nome_cliente}} o {{data_appuntamento}}, e visualizzare un'anteprima prima di salvare.

📦 Prodotti & Inventario
Q: Come aggiungo un prodotto al catalogo?
A: Vai su Catalogo → Prodotti → "+ Aggiungi prodotto". Inserisci nome, prezzo di vendita, prezzo di costo e quantità iniziale. Puoi anche aggiungere una foto e associare il prodotto a una categoria per trovarlo più facilmente.

Q: Come registro una vendita durante un appuntamento?
A: Quando chiudi un appuntamento, clicca su "Aggiungi prodotto venduto" prima di confermare. Scegli il prodotto dal catalogo e la quantità: lo stock si aggiorna in automatico e la vendita appare nel report Vendite.

Q: Come faccio a sapere quando sto finendo uno stock?
A: In Catalogo → Prodotti puoi impostare una soglia di riordino per ogni articolo. Quando lo stock scende sotto quella soglia, ricevi una notifica e il prodotto appare nella lista "Da riordinare" con evidenziazione arancione.

⚙️ Impostazioni & Account
Q: Come cambio logo o colori della mia app?
A: Vai su Impostazioni → La mia App → Personalizzazione. Carica un nuovo logo (formato PNG o SVG consigliato) e usa il color picker per scegliere il colore primario. Puoi vedere un'anteprima in tempo reale prima di salvare.

Q: Come aggiungo un membro del team?
A: Vai su Team → "+ Invita membro". Inserisci il nome, il ruolo e l'email. Il tuo collaboratore riceve una mail di invito con le istruzioni per accedere. Puoi assegnare permessi diversi per ogni membro (es. solo calendario, o accesso completo).

Q: Come esporto i miei dati?
A: In Impostazioni → Account → Esporta dati puoi scaricare l'elenco clienti, la storico appuntamenti e le vendite in formato CSV. L'esportazione è disponibile per qualsiasi intervallo di date e viene inviata alla tua email entro qualche minuto.
`

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const rl = checkRateLimit(`aiuto-chat:${user.id}`, 20, 60_000)
  if (!rl.allowed) {
    return new Response('Troppe richieste. Riprova tra poco.', {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfterSec) },
    })
  }

  const body = await req.json()
  const parsed = AiutoChatSchema.safeParse(body)
  if (!parsed.success) {
    return new Response('Invalid request', { status: 400 })
  }
  const { messages } = parsed.data

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: `Sei l'assistente di supporto di Styll, una piattaforma SaaS per barbieri italiani. Rispondi SOLO a domande su Styll. Sii conciso, chiaro e usa un tono caldo e diretto (tu). Se la domanda non riguarda Styll, declina gentilmente. Ecco le FAQ disponibili come contesto:\n\n${FAQ_CONTEXT}`,
    messages: messages.slice(-10),
  })

  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(new TextEncoder().encode(event.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
