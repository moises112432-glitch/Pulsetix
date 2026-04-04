import resend

from app.core.config import settings


async def send_order_confirmation(
    to_email: str,
    user_name: str,
    event_title: str,
    tickets: list,
) -> None:
    """Send order confirmation email with ticket details."""
    if not settings.RESEND_API_KEY:
        return

    resend.api_key = settings.RESEND_API_KEY

    ticket_rows = ""
    for t in tickets:
        ticket_rows += f"""
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
            <strong style="color: #111827;">{t.ticket_type.name}</strong>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-family: monospace; font-size: 12px; color: #9ca3af;">
            {t.qr_code_token[:16]}...
          </td>
        </tr>
        """

    ticket_links = ""
    for t in tickets:
        ticket_links += f"""
        <a href="{settings.FRONTEND_URL}/ticket/{t.qr_code_token}"
           style="display: inline-block; margin: 4px 8px 4px 0; padding: 8px 16px; background: #f5f3ff; color: #7c3aed; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">
          View {t.ticket_type.name} Ticket
        </a>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #7c3aed; color: white; width: 40px; height: 40px; line-height: 40px; border-radius: 10px; font-weight: bold; font-size: 18px;">P</div>
          <p style="margin: 8px 0 0; font-size: 14px; color: #9ca3af;">PulseTix</p>
        </div>

        <!-- Card -->
        <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Purple banner -->
          <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 32px 24px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 13px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Order Confirmed</p>
            <h1 style="margin: 0; color: white; font-size: 22px;">{event_title}</h1>
          </div>

          <!-- Body -->
          <div style="padding: 24px;">
            <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
              Hey {user_name}! Your tickets are confirmed. Show your QR code at the entrance for check-in.
            </p>

            <!-- Tickets table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #f9fafb; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 10px 16px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Ticket</th>
                  <th style="padding: 10px 16px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Code</th>
                </tr>
              </thead>
              <tbody>
                {ticket_rows}
              </tbody>
            </table>

            <!-- View tickets buttons -->
            <div style="text-align: center; margin-bottom: 8px;">
              {ticket_links}
            </div>
          </div>

          <!-- Footer inside card -->
          <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              You can also view all your tickets at
              <a href="{settings.FRONTEND_URL}/checkout" style="color: #7c3aed; text-decoration: none;">My Tickets</a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <p style="text-align: center; margin-top: 24px; font-size: 12px; color: #d1d5db;">
          PulseTix &mdash; Create events that people love
        </p>
      </div>
    </body>
    </html>
    """

    resend.Emails.send({
        "from": settings.FROM_EMAIL,
        "to": [to_email],
        "subject": f"Your tickets for {event_title} 🎫",
        "html": html,
    })
