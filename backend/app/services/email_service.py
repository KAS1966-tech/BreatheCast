from brevo import Brevo
from brevo.core import ApiError
from brevo.transactional_emails import (
    SendTransacEmailRequestSender,
    SendTransacEmailRequestToItem,
)

from app.core.config import settings
from app.core.logger import logger


def send_otp_email(
    recipient_email: str,
    otp: str,
) -> None:
    # 1. Initialize the modern, unified Brevo client
    client = Brevo(api_key=settings.BREVO_API_KEY)

    try:
        # 2. Directly call the transactional emails namespace
        client.transactional_emails.send_transac_email(
            sender=SendTransacEmailRequestSender(
                name=settings.APP_NAME,
                email=settings.BREVO_SENDER_EMAIL,
            ),
            to=[
                SendTransacEmailRequestToItem(
                    email=recipient_email
                )
            ],
            subject="Your verification code",
            html_content=f"""
            <html>
                <body>
                    <h2>Email Verification</h2>
                    <p>Your verification code is:</p>
                    <h1>{otp}</h1>
                    <p>This code expires in {settings.OTP_EXPIRE_MINUTES} minutes.</p>
                    <p>If you did not request this code, you can safely ignore this email.</p>
                </body>
            </html>
            """,
        )

    # 3. Catch the updated modern ApiError exception class
    except ApiError:
        logger.exception(
            "Failed to send OTP email | recipient=%s",
            recipient_email,
        )
        raise