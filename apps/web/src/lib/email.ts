import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildRootAppUrl, buildTenantAppUrl } from '@/lib/auth/urls'

// Initialize Resend client (requires RESEND_API_KEY env var)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface EmailLegalLinks {
  privacyUrl: string
  termsUrl: string
}

export interface MarketingEmailOptions {
  explanation?: string
  managePreferencesUrl?: string
  oneClickUrl: string
  unsubscribeUrl: string
}

export interface EmailTenantBranding {
  business_name: string
  primary_color: string
  logo_url?: string
  legal_links?: EmailLegalLinks
}

export function buildClientFacingEmailLegalLinks(slug: string): EmailLegalLinks {
  return {
    privacyUrl: buildTenantAppUrl(slug, '/privacy'),
    termsUrl: buildTenantAppUrl(slug, '/termini'),
  }
}

export function buildClientFacingEmailTenantBranding({
  business_name,
  primary_color,
  slug,
  logo_url,
}: {
  business_name: string
  primary_color: string
  slug: string
  logo_url?: string
}): EmailTenantBranding {
  return {
    business_name,
    primary_color,
    logo_url,
    legal_links: buildClientFacingEmailLegalLinks(slug),
  }
}

function darkenHex(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '#1a1a2e'
  const r = Math.round(parseInt(h.slice(0, 2), 16) * 0.6)
  const g = Math.round(parseInt(h.slice(2, 4), 16) * 0.6)
  const b = Math.round(parseInt(h.slice(4, 6), 16) * 0.6)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function buildMarketingEmailHeaders(
  marketing: MarketingEmailOptions,
): Record<string, string> {
  return {
    'List-Unsubscribe': `<${marketing.oneClickUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

export function buildEmailHtml({
  body,
  tenant,
  marketing,
  category,
  title,
  details,
  ctaText,
  ctaUrl,
}: {
  body: string
  tenant?: EmailTenantBranding
  marketing?: MarketingEmailOptions
  category?: string
  title?: string
  details?: Record<string, string>
  ctaText?: string
  ctaUrl?: string
}): string {
  const primaryColor = tenant?.primary_color ?? '#111111'
  const darkColor = darkenHex(primaryColor)
  const businessName = tenant?.business_name ?? 'Styll'
  const logoUrl = tenant?.logo_url
  const initial = businessName.charAt(0).toUpperCase()
  const legalLinks = tenant?.legal_links ?? {
    termsUrl: buildRootAppUrl('/termini'),
    privacyUrl: buildRootAppUrl('/privacy'),
  }

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${businessName}" width="56" height="56" style="width:56px;height:56px;border-radius:16px;display:block;margin:0 auto;">`
    : `<div style="width:56px;height:56px;border-radius:16px;background:rgba(255,255,255,0.15);line-height:56px;text-align:center;font-size:24px;font-weight:700;color:#ffffff;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;">${initial}</div>`

  const categoryHtml = category
    ? `<p style="margin:0 0 12px;font-size:13px;font-weight:700;color:${primaryColor};text-transform:uppercase;letter-spacing:0.08em;font-family:system-ui,-apple-system,sans-serif;">${category}</p>`
    : ''

  const titleHtml = title
    ? `<h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#111111;line-height:1.3;font-family:system-ui,-apple-system,sans-serif;">${title}</h1>`
    : ''

  const detailsHtml = details && Object.keys(details).length > 0
    ? `<div style="background:#f8f8f9;border-radius:12px;padding:20px 24px;margin:20px 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${Object.entries(details).map(([label, value]) => `
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#888888;font-family:system-ui,-apple-system,sans-serif;">${label}</td>
            <td style="padding:6px 0;font-size:14px;font-weight:600;color:#111111;text-align:right;font-family:system-ui,-apple-system,sans-serif;">${value}</td>
          </tr>`).join('')}
        </table>
      </div>`
    : ''

  const ctaHtml = ctaText && ctaUrl
    ? `<div style="margin:24px 0 8px;"><a href="${ctaUrl}" style="display:block;background:${primaryColor};color:#ffffff;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600;font-family:system-ui,-apple-system,sans-serif;">${ctaText}</a></div>`
    : ''
  const marketingHtml = marketing
    ? `<div style="margin-top:20px;padding-top:20px;border-top:1px solid #eeeeee;">
        <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#777777;font-family:system-ui,-apple-system,sans-serif;">
          ${marketing.explanation ?? `Ricevi questa email perché hai scelto di ricevere comunicazioni promozionali da ${businessName}.`}
        </p>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#777777;font-family:system-ui,-apple-system,sans-serif;">
          <a href="${marketing.unsubscribeUrl}" style="color:#777777;text-decoration:underline;">Annulla iscrizione</a>${marketing.managePreferencesUrl ? ` &nbsp;&middot;&nbsp; <a href="${marketing.managePreferencesUrl}" style="color:#777777;text-decoration:underline;">Gestisci preferenze</a>` : ''}
        </p>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:16px;border:1px solid #e5e5e5;overflow:hidden;">
          <tr>
            <td bgcolor="${primaryColor}" style="background-color:${primaryColor};background-image:linear-gradient(135deg,${primaryColor},${darkColor});padding:32px 32px 28px;text-align:center;">
              ${logoHtml}
              <p style="margin:12px 0 0;font-size:18px;font-weight:700;color:#ffffff;font-family:system-ui,-apple-system,sans-serif;">${businessName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 28px;">
              ${categoryHtml}
              ${titleHtml}
              <div style="font-size:15px;line-height:1.6;color:#444444;font-family:system-ui,-apple-system,sans-serif;">${body.replace(/\n/g, '<br>')}</div>
              ${detailsHtml}
              ${ctaHtml}
              ${marketingHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #eeeeee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;font-family:system-ui,-apple-system,sans-serif;">
                Powered by Styll &nbsp;&middot;&nbsp; <a href="${legalLinks.termsUrl}" style="color:#aaaaaa;text-decoration:none;">Termini</a> &nbsp;&middot;&nbsp; <a href="${legalLinks.privacyUrl}" style="color:#aaaaaa;text-decoration:none;">Privacy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendTemplatedEmail({
  to,
  templateSlug,
  variables,
  tenant,
  marketing,
  headers,
  category,
  title,
  details,
  ctaText,
  ctaUrl,
}: {
  to: string
  templateSlug: string
  variables: Record<string, string>
  tenant?: EmailTenantBranding
  marketing?: MarketingEmailOptions
  headers?: Record<string, string>
  category?: string
  title?: string
  details?: Record<string, string>
  ctaText?: string
  ctaUrl?: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error('[sendTemplatedEmail] Resend not configured')
    return { success: false, error: 'Email service not configured' }
  }

  const admin = createAdminClient()
  const { data: template, error: dbError } = await admin
    .from('email_templates')
    .select('subject, body')
    .eq('slug', templateSlug)
    .eq('is_active', true)
    .single()

  if (dbError || !template) {
    console.error('[sendTemplatedEmail] Template not found:', templateSlug, dbError)
    return { success: false, error: `Template "${templateSlug}" not found` }
  }

  const interpolate = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`)

  const subject = interpolate(template.subject as string)
  const bodyText = interpolate(template.body as string)
  const html = buildEmailHtml({
    body: bodyText,
    tenant,
    marketing,
    category,
    title,
    details,
    ctaText,
    ctaUrl,
  })
  const resolvedHeaders = marketing
    ? { ...buildMarketingEmailHeaders(marketing), ...(headers ?? {}) }
    : headers

  try {
    const result = await resend.emails.send({
      from: 'Styll <noreply@mail.styll.it>',
      to,
      subject,
      html,
      text: bodyText,
      headers: resolvedHeaders,
    })

    if (result.error) {
      console.error('[sendTemplatedEmail] Resend error:', result.error)
      return { success: false, error: result.error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[sendTemplatedEmail] Exception:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function sendVerificationCodeEmail({
  email,
  code,
}: {
  email: string
  code: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error('[sendVerificationCodeEmail] Resend not configured')
    return { success: false, error: 'Email service not configured' }
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#333;margin:0;padding:0}
  .wrap{max-width:520px;margin:0 auto;padding:32px 20px;background:#f9fafb}
  .card{background:#fff;border-radius:12px;padding:36px 32px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .logo{font-size:22px;font-weight:700;color:#111;margin-bottom:28px}
  .title{font-size:20px;font-weight:700;color:#111;margin-bottom:8px}
  .sub{font-size:14px;color:#555;line-height:1.6;margin-bottom:28px}
  .code-box{background:#f3f4f6;border-radius:10px;padding:22px;text-align:center;margin-bottom:24px}
  .code{font-size:42px;font-weight:800;letter-spacing:10px;color:#111;font-variant-numeric:tabular-nums}
  .expiry{font-size:13px;color:#888;margin-top:8px}
  .note{font-size:12px;color:#aaa;margin-top:28px;padding-top:20px;border-top:1px solid #eee}
</style>
</head>
<body>
<div class="wrap"><div class="card">
  <div class="logo">Styll</div>
  <div class="title">Conferma la tua email</div>
  <p class="sub">Inserisci questo codice nella pagina di verifica per completare la registrazione.</p>
  <div class="code-box">
    <div class="code">${code}</div>
    <div class="expiry">Valido per 15 minuti</div>
  </div>
  <p class="note">Non hai richiesto la registrazione su Styll? Ignora questa email.</p>
</div></div>
</body>
</html>`

  const text = `Il tuo codice di verifica Styll è: ${code}\n\nValido per 15 minuti.\n\nSe non hai richiesto la registrazione, ignora questa email.`

  try {
    const result = await resend.emails.send({
      from: 'Styll <noreply@mail.styll.it>',
      to: email,
      subject: `${code} — il tuo codice di verifica Styll`,
      html,
      text,
    })
    if (result.error) {
      console.error('[sendVerificationCodeEmail] Resend error:', result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (err) {
    console.error('[sendVerificationCodeEmail] Exception:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function sendWelcomeEmail({
  email,
  businessName,
  slug,
  dashboardUrl,
}: {
  email: string
  businessName: string
  slug: string
  dashboardUrl: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error('[sendWelcomeEmail] Resend not configured')
    return { success: false, error: 'Email service not configured' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://styll.it'
  const publicUrl = `${appUrl}/${slug}`

  const html = buildEmailHtml({
    body: `La tua app è live e i clienti possono già prenotare.\n\nCondividi il link con i tuoi clienti per iniziare a ricevere prenotazioni.\n\nPrimo step: aggiungi i tuoi clienti o prova tu stesso una prenotazione dalla dashboard.`,
    tenant: { business_name: businessName, primary_color: '#111111' },
    category: 'Benvenuto',
    title: `Sei dentro! ${businessName} è online 🎉`,
    details: {
      'App clienti': publicUrl,
      'Dashboard': dashboardUrl,
    },
    ctaText: 'Vai alla dashboard',
    ctaUrl: dashboardUrl,
  })

  const text = `Benvenuto in Styll!\n\n${businessName} è online.\n\nApp clienti: ${publicUrl}\nDashboard: ${dashboardUrl}\n\nPrimo step: aggiungi i tuoi clienti o prova una prenotazione.\n\nStyll`

  try {
    const result = await resend.emails.send({
      from: 'Styll <noreply@mail.styll.it>',
      to: email,
      subject: `${businessName} è online su Styll 🎉`,
      html,
      text,
    })
    if (result.error) {
      console.error('[sendWelcomeEmail] Resend error:', result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (err) {
    console.error('[sendWelcomeEmail] Exception:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Send a team invitation email to a new member.
 * The invitation link includes a token that the user can click to join.
 */
export async function sendInvitationEmail({
  recipientEmail,
  recipientName,
  tenantName,
  inviterName,
  role,
  invitationLink,
}: {
  recipientEmail: string
  recipientName?: string
  tenantName: string
  inviterName: string
  role: string
  invitationLink: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error('[sendInvitationEmail] Resend not configured - RESEND_API_KEY is missing')
    return {
      success: false,
      error: 'Email service not configured',
    }
  }

  const roleLabel = {
    owner: 'Titolare',
    manager: 'Manager',
    staff: 'Staff',
    receptionist: 'Receptionist',
  }[role] || role

  const recipientDisplayName = recipientName || recipientEmail.split('@')[0]

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .card { background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .logo { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #111; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #111; }
    .body-text { font-size: 14px; line-height: 1.6; color: #555; margin-bottom: 24px; }
    .details { background-color: #f5f5f5; border-radius: 6px; padding: 16px; margin: 24px 0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .detail-label { color: #777; }
    .detail-value { font-weight: 600; color: #111; }
    .button { display: inline-block; background-color: #111; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 24px 0; }
    .footer { font-size: 12px; color: #999; margin-top: 32px; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
    .link-note { font-size: 12px; color: #999; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">Styll</div>
      
      <p class="greeting">Ciao ${recipientDisplayName}!</p>
      
      <p class="body-text">
        <strong>${inviterName}</strong> ti ha invitato a unirti al team di <strong>${tenantName}</strong> come <strong>${roleLabel}</strong>.
      </p>
      
      <p class="body-text">
        Clicca il pulsante sottostante per accettare l'invito e completare la configurazione del tuo profilo.
      </p>
      
      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Salone:</span>
          <span class="detail-value">${tenantName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Ruolo:</span>
          <span class="detail-value">${roleLabel}</span>
        </div>
      </div>
      
      <a href="${invitationLink}" class="button">Accetta invito</a>
      
      <p class="link-note">
        Oppure copia e incolla questo link nel tuo browser:<br>
        <code>${invitationLink}</code>
      </p>
      
      <p class="body-text" style="font-size: 12px; color: #999; margin-top: 32px;">
        Questo link scade tra 7 giorni.
      </p>
      
      <div class="footer">
        <p>© 2025 Styll. Tutti i diritti riservati.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `

  const plainText = `
Ciao ${recipientDisplayName}!

${inviterName} ti ha invitato a unirti al team di ${tenantName} come ${roleLabel}.

Accetta l'invito: ${invitationLink}

Questo link scade tra 7 giorni.

© 2025 Styll
  `

  try {
    const result = await resend.emails.send({
      from: 'Styll <noreply@mail.styll.it>',
      to: recipientEmail,
      subject: `Sei stato invitato a unirti a ${tenantName}`,
      html: htmlContent,
      text: plainText,
    })

    if (result.error) {
      console.error('[sendInvitationEmail] Resend API error:', result.error)
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[sendInvitationEmail] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email',
    }
  }
}
