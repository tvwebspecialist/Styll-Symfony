import { Resend } from 'resend'

// Initialize Resend client (requires RESEND_API_KEY env var)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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
  invitationToken,
  invitationLink,
}: {
  recipientEmail: string
  recipientName?: string
  tenantName: string
  inviterName: string
  role: string
  invitationToken: string
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

    console.log(`[sendInvitationEmail] Email sent successfully to ${recipientEmail}`)
    return { success: true }
  } catch (error) {
    console.error('[sendInvitationEmail] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email',
    }
  }
}
