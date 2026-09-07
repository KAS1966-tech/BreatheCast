import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import EmailOTP
from app.services.security import hash_value, verify_value
from app.core.config import settings


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def create_otp(
    db: Session,
    email: str,
) -> str:

    # Remove previous OTPs for this email
    db.query(EmailOTP).filter(
        EmailOTP.email == email
    ).delete(synchronize_session=False)

    otp = generate_otp()

    otp_record = EmailOTP(
        email=email,
        otp_hash=hash_value(otp),
        expires_at=(
            datetime.now(timezone.utc)
            + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        ),
        attempts=0,
    )

    db.add(otp_record)
    db.commit()
    return otp


def verify_otp(
    db: Session,
    email: str,
    otp: str,
) -> bool:

    otp_record = (
        db.query(EmailOTP)
        .filter(EmailOTP.email == email)
        .order_by(EmailOTP.created_at.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code not found.",
        )

    now = datetime.now(timezone.utc)

    if otp_record.expires_at < now:
        db.delete(otp_record)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired.",
        )

    if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
        db.delete(otp_record)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification attempts. Please request a new code.",
        )

    otp_record.attempts += 1

    if not verify_value(otp, otp_record.otp_hash):
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code.",
        )

    db.delete(otp_record)
    db.commit()

    return True