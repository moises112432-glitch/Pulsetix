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


async def send_transfer_email(
    to_email: str,
    sender_name: str,
    event_title: str,
    ticket_type: str,
    claim_url: str,
) -> None:
    """Send ticket transfer email to recipient."""
    if not settings.RESEND_API_KEY:
        return

    resend.api_key = settings.RESEND_API_KEY

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
            <p style="margin: 0 0 4px; font-size: 13px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Ticket Transfer</p>
            <h1 style="margin: 0; color: white; font-size: 22px;">{event_title}</h1>
          </div>

          <!-- Body -->
          <div style="padding: 24px;">
            <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
              <strong>{sender_name}</strong> wants to transfer a <strong>{ticket_type}</strong> ticket to you!
            </p>

            <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
              Click the button below to claim your ticket. You'll need to sign in or create a free account.
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 8px;">
              <a href="{claim_url}"
                 style="display: inline-block; padding: 14px 32px; background: #7c3aed; color: white; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 600;">
                Claim Your Ticket
              </a>
            </div>
          </div>

          <!-- Footer inside card -->
          <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              If you weren't expecting this, you can safely ignore this email.
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
        "subject": f"{sender_name} sent you a ticket for {event_title} 🎟️",
        "html": html,
    })


async def send_promoter_invitation(
    to_email: str,
    organizer_name: str,
    event_title: str,
    referral_url: str,
    personal_promo_code: str | None,
    commission_percent: float,
) -> None:
    """Send promoter invitation email."""
    if not settings.RESEND_API_KEY:
        return

    resend.api_key = settings.RESEND_API_KEY

    promo_section = ""
    if personal_promo_code:
        promo_section = f"""
            <div style="margin: 20px 0; padding: 16px; background: #f5f3ff; border-radius: 12px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Your Personal Promo Code</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #7c3aed; font-family: monospace;">{personal_promo_code}</p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">Share this code with buyers for a discount</p>
            </div>
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
            <p style="margin: 0 0 4px; font-size: 13px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Promoter Invitation</p>
            <h1 style="margin: 0; color: white; font-size: 22px;">{event_title}</h1>
          </div>

          <!-- Body -->
          <div style="padding: 24px;">
            <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
              <strong>{organizer_name}</strong> has invited you to be a promoter for their event!
              You'll earn <strong>{commission_percent:.0f}%</strong> commission on every ticket sale you refer.
            </p>

            {promo_section}

            <!-- CTA Button -->
            <div style="text-align: center; margin: 24px 0 8px;">
              <a href="{referral_url}"
                 style="display: inline-block; padding: 14px 32px; background: #7c3aed; color: white; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 600;">
                View Event & Start Sharing
              </a>
            </div>

            <p style="margin: 16px 0 0; text-align: center; color: #9ca3af; font-size: 12px;">
              Your referral link: {referral_url}
            </p>
          </div>

          <!-- Footer inside card -->
          <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              Share the event link or promo code and earn on every sale!
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
        "subject": f"You're invited to promote {event_title} 🔗",
        "html": html,
    })


async def send_waitlist_notification(
    to_email: str,
    name: str,
    event_title: str,
    event_url: str,
) -> None:
    """Notify waitlisted user that tickets are available."""
    if not settings.RESEND_API_KEY:
        return

    resend.api_key = settings.RESEND_API_KEY

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

          <!-- Green banner -->
          <div style="background: linear-gradient(135deg, #059669, #047857); padding: 32px 24px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 13px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Tickets Available</p>
            <h1 style="margin: 0; color: white; font-size: 22px;">{event_title}</h1>
          </div>

          <!-- Body -->
          <div style="padding: 24px;">
            <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
              Hey {name}! Great news — tickets are now available for <strong>{event_title}</strong>!
            </p>

            <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
              You were on the waitlist, so we wanted to let you know first. Grab your tickets before they sell out again!
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 8px;">
              <a href="{event_url}"
                 style="display: inline-block; padding: 14px 32px; background: #7c3aed; color: white; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 600;">
                Get Tickets Now
              </a>
            </div>
          </div>

          <!-- Footer inside card -->
          <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              Hurry — tickets are first come, first served!
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
        "subject": f"Tickets available for {event_title}! 🎉",
        "html": html,
    })
