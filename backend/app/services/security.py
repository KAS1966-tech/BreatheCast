import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from pwdlib import PasswordHash, exceptions

from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.config import settings
from fastapi import HTTPException, status

ALGORITHM = "HS256"
password_hasher = PasswordHash.recommended()

def hash_password(password: str) -> str:
    """Hash a password and return the hashed value."""
    return password_hasher.hash(password)

def verify_password(
    password: str,
    hashed_password: str,
) -> bool:
    """Verify a plaintext password against its stored hash."""

    try:
        return password_hasher.verify(
            password,
            hashed_password,
        )
    except exceptions.InvalidHashError:
        return False

def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:

    to_encode = data.copy()
    expire = (
        datetime.now(timezone.utc) + expires_delta
        if expires_delta
        else datetime.now(timezone.utc)
        + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRY_MINUTES
        )
    )
    to_encode.update({
        "sub": str(data["id"]),
        "exp": expire,
    })

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )

def decode_access_token(
    token: str,
) -> dict[str, Any]:

    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

def create_refresh_token(data: dict) -> str:

    payload = data.copy()

    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRY_DAYS
        )
    )

    payload.update({
        "sub": str(data["id"]),
        "exp": expire,
        "type": "refresh",
    })

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_refresh_token(
    token: str,
) -> dict[str, Any]:

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        return payload

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )

    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

def hash_value(value: str) -> str:
    return password_hasher.hash(value)


def verify_value(value: str, hashed_value: str) -> bool:
    try:
        return password_hasher.verify(value, hashed_value)
    except exceptions.InvalidHashError:
        return False