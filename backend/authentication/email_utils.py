"""
Dynamic email sending utility.
Reads the email provider config from SiteSettings at send time.
"""
import json
import logging

from django.core.mail import EmailMultiAlternatives
from django.core.mail.backends.smtp import EmailBackend as SMTPBackend
from django.core.mail.backends.console import EmailBackend as ConsoleBackend

logger = logging.getLogger(__name__)


def _get_smtp_connection(settings):
    return SMTPBackend(
        host=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_username,
        password=settings.smtp_password,
        use_tls=settings.smtp_use_tls,
        use_ssl=settings.smtp_use_ssl,
    )


def _get_ses_connection(settings):
    """Use SMTP interface to SES."""
    ses_smtp_host = f'email-smtp.{settings.ses_aws_region}.amazonaws.com'
    return SMTPBackend(
        host=ses_smtp_host,
        port=587,
        username=settings.ses_aws_access_key_id,
        password=settings.ses_aws_secret_access_key,
        use_tls=True,
        use_ssl=False,
    )


def _get_google_connection(settings):
    """Use Gmail SMTP relay via service account OAuth2 (XOAUTH2).

    For simplicity, we use the Gmail SMTP relay with a delegated
    service account.  The google-auth library is required.
    """
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request
    except ImportError:
        raise RuntimeError(
            'google-auth package is required for Google API email. '
            'Install it with: pip install google-auth'
        )

    sa_info = json.loads(settings.google_service_account_json)
    creds = service_account.Credentials.from_service_account_info(
        sa_info,
        scopes=['https://www.googleapis.com/auth/gmail.send'],
        subject=settings.google_delegated_email,
    )
    creds.refresh(Request())

    # Use SMTP with XOAUTH2
    import smtplib
    from django.core.mail.backends.smtp import EmailBackend as _SMTP

    class GmailOAuth2Backend(_SMTP):
        def open(self):
            if self.connection:
                return False
            conn = smtplib.SMTP('smtp.gmail.com', 587)
            conn.ehlo()
            conn.starttls()
            conn.ehlo()
            auth_string = f'user={settings.google_delegated_email}\x01auth=Bearer {creds.token}\x01\x01'
            conn.docmd('AUTH', 'XOAUTH2 ' + __import__('base64').b64encode(auth_string.encode()).decode())
            self.connection = conn
            return True

    return GmailOAuth2Backend()


def _get_connection(settings):
    backend = settings.email_backend
    if backend == 'smtp':
        return _get_smtp_connection(settings)
    elif backend == 'ses':
        return _get_ses_connection(settings)
    elif backend == 'google':
        return _get_google_connection(settings)
    else:
        return ConsoleBackend()


def get_from_address(settings):
    name = settings.email_from_name
    addr = settings.email_from_address
    if name and addr:
        return f'{name} <{addr}>'
    return addr or 'noreply@localhost'


def send_email(subject, body_text, body_html, to_list):
    """Send an email using the provider configured in SiteSettings."""
    from .models import SiteSettings
    settings = SiteSettings.load()

    connection = _get_connection(settings)
    from_email = get_from_address(settings)

    msg = EmailMultiAlternatives(
        subject=subject,
        body=body_text,
        from_email=from_email,
        to=to_list,
        connection=connection,
    )
    if body_html:
        msg.attach_alternative(body_html, 'text/html')
    msg.send()


def send_test_email(to_address):
    """Send a test email to verify configuration."""
    send_email(
        subject='Test Email — Cloud Native Asset Manager',
        body_text='This is a test email. If you received this, email delivery is working.',
        body_html='<p>This is a <strong>test email</strong>. If you received this, email delivery is working.</p>',
        to_list=[to_address],
    )
