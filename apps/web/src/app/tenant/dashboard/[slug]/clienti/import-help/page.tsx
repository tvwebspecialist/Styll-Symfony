import Link from 'next/link'

export default function ImportHelpPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px', fontFamily: 'inherit' }}>
      <Link
        href="/clienti"
        style={{
          display:    'inline-flex',
          alignItems: 'center',
          gap:        6,
          fontSize:   13,
          color:      '#888888',
          textDecoration: 'none',
          marginBottom: 32,
        }}
      >
        ← Torna ai clienti
      </Link>

      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#222222', margin: '0 0 8px' }}>
        Come esportare i tuoi clienti
      </h1>
      <p style={{ fontSize: 15, color: '#888888', margin: '0 0 40px' }}>
        Segui le istruzioni per la tua piattaforma e poi importa il file CSV in Styll.
      </p>

      {[
        {
          name: 'Fresha',
          color: '#4CAF50',
          steps: [
            'Accedi al tuo account Fresha su fresha.com',
            'Vai su <strong>Clienti</strong> nel menu laterale',
            'Clicca su <strong>Esporta clienti</strong> (icona download in alto a destra)',
            'Seleziona il formato <strong>CSV</strong> e scarica il file',
            'Carica il file in Styll e seleziona "Fresha" come sorgente',
          ],
          note: 'Le colonne di Fresha vengono riconosciute automaticamente da Styll.',
        },
        {
          name: 'Treatwell',
          color: '#FF6B6B',
          steps: [
            'Accedi al tuo account Treatwell Connect su connect.treatwell.it',
            'Vai su <strong>Clienti</strong> → <strong>Lista clienti</strong>',
            'Usa il filtro per selezionare tutti i clienti, poi clicca <strong>Esporta</strong>',
            'Scarica il file CSV generato',
            'Carica il file in Styll e seleziona "Treatwell" come sorgente',
          ],
          note: 'Se Treatwell usa colonne diverse, puoi associarle manualmente nello step 2.',
        },
        {
          name: 'Booksy',
          color: '#5B5EA6',
          steps: [
            'Accedi al tuo account Booksy Business',
            'Vai su <strong>Clienti</strong> nel menu principale',
            'Clicca su <strong>Esporta</strong> e scegli il periodo desiderato',
            'Scarica il file CSV',
            'Carica il file in Styll e seleziona "Booksy" come sorgente',
          ],
          note: 'Booksy potrebbe dividere il nome in "First Name" e "Last Name". Mappa entrambe su "Nome completo" — Styll le unirà.',
        },
        {
          name: 'Altro CSV',
          color: '#888888',
          steps: [
            'Esporta i tuoi clienti dal tuo gestionale in formato CSV o Excel',
            'Se usi Excel, salva il file come <strong>CSV UTF-8</strong> (File → Salva con nome)',
            'Assicurati che il file abbia una riga di intestazione con i nomi delle colonne',
            'Carica il file in Styll e associa le colonne manualmente nello step 2',
          ],
          note: 'Styll riconosce automaticamente molti nomi di colonne comuni (es. "Email", "Telefono", "Nome").',
        },
      ].map((platform) => (
        <div
          key={platform.name}
          style={{
            marginBottom: 32,
            border:       '1px solid #F0F0F0',
            borderRadius: 16,
            overflow:     'hidden',
          }}
        >
          <div style={{
            padding:    '16px 20px',
            background: '#FAFAFA',
            borderBottom: '1px solid #F0F0F0',
            display:    'flex',
            alignItems: 'center',
            gap:        10,
          }}>
            <div style={{
              width:        10,
              height:       10,
              borderRadius: '50%',
              background:   platform.color,
              flexShrink:   0,
            }} />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#222222' }}>
              {platform.name}
            </h2>
          </div>

          <div style={{ padding: '20px' }}>
            <ol style={{ margin: '0 0 16px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {platform.steps.map((step, i) => (
                <li
                  key={i}
                  style={{ fontSize: 14, color: '#444444', lineHeight: 1.5 }}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: step }}
                />
              ))}
            </ol>
            {platform.note && (
              <div style={{
                padding:      '10px 14px',
                background:   '#FEF9C3',
                borderRadius: 8,
                border:       '1px solid #FDE68A',
              }}>
                <p style={{ margin: 0, fontSize: 13, color: '#854D0E' }}>
                  💡 {platform.note}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{
        padding:      '20px',
        background:   '#F9F9F9',
        borderRadius: 16,
        border:       '1px solid #F0F0F0',
        textAlign:    'center',
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#222222' }}>
          Pronto ad importare?
        </p>
        <Link
          href="/clienti"
          style={{
            display:      'inline-block',
            padding:      '10px 24px',
            background:   '#1A1A1A',
            color:        '#FFFFFF',
            borderRadius: 10,
            fontSize:     14,
            fontWeight:   600,
            textDecoration: 'none',
          }}
        >
          Vai all&apos;import
        </Link>
      </div>
    </div>
  )
}
