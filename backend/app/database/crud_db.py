from fastapi import HTTPException,status,Depends,Cookie

import sqlalchemy as sa
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError,IntegrityError

from app.services.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    create_refresh_token,
)
from app.schemas.input_schemas import SignupRequest,LoginRequest,WeatherAQIPrediction
from app.database.connection import Authentication,History,UploadedFile,RefreshToken
from app.database.database import get_db

from app.helpers.cleaner import clean_text

from datetime import datetime, timedelta, timezone
from app.core.config import settings

from app.core.logger import logger


def get_user_by_email(db:Session,email: str)->Authentication | None:

    query = sa.select(Authentication).where(Authentication.email == email)

    result = db.execute(query)

    return result.scalar_one_or_none()

def get_user_by_username(db:Session,username: str)->Authentication | None:

    query = sa.select(Authentication).where(Authentication.username == username)

    result = db.execute(query)

    return result.scalar_one_or_none()

def get_user_by_id(
    db: Session,
    user_id: int
)->Authentication | None:
    return db.get(Authentication, user_id)

def get_user_by_google_id(
    db: Session,
    google_id: str,
) -> Authentication | None:
    query = sa.select(Authentication).where(
        Authentication.google_id == google_id
    )

    return db.execute(query).scalar_one_or_none()

def create_user(db: Session, user_data: SignupRequest)->tuple[Authentication, str, str]:
    """Create a new user with a hashed password."""
    hashed_password = hash_password(user_data.password)

    new_user = Authentication(
        fullname=user_data.fullname,
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
    )

    if get_user_by_username(db, user_data.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    if get_user_by_email(db, user_data.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)

        access_token, refresh_token = generate_user_tokens(db,new_user)

        return new_user,access_token,refresh_token
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already exists",
        )
    except SQLAlchemyError:
        db.rollback()
        raise

def get_or_create_google_user(
    db: Session,
    google_id: str,
    email: str,
    fullname: str,
) -> Authentication:

    user = get_user_by_google_id(db, google_id)

    if user:
        return user

    # Google account doesn't exist yet.
    # Check whether this email already belongs to an account.
    user = get_user_by_email(db, email)

    if user:
        if user.hashed_password is not None and user.google_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists via standard signup. Please log in with your password.",
            )
        user.google_id = google_id

        db.commit()
        db.refresh(user)

        return user

    # Create a new Google account.
    username_base = email.split("@")[0]

    username = username_base
    counter = 1

    while get_user_by_username(db, username):
        counter += 1
        username = f"{username_base}{counter}"

    new_user = Authentication(
        fullname=fullname,
        username=username,
        email=email,
        google_id=google_id,
        hashed_password=None,
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)

        return new_user

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create Google account",
        )

    except SQLAlchemyError:
        db.rollback()
        raise

def verify_user(db:Session,userdata:LoginRequest)->dict:

    generic_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Incorrect email or password")

    user = get_user_by_email(db, userdata.email)

    if not user:
        raise generic_error

    if user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google sign-in. Continue with Google or set a password in your profile.",
        )

    if not verify_password(userdata.password, user.hashed_password):
        raise generic_error

    access_token, refresh_token = generate_user_tokens(
    db,
    user
)
    return {
        "access_token":access_token,
        "refresh_token":refresh_token,
        "status":"success",
        "user":{
            "id":user.id,
            "username":user.username,
            "fullname":user.fullname,
            "email":user.email,
            "created_at":user.created_at
        }
    }

def save_refresh_token(
    db: Session,
    user_id: int,
    token: str,
    expires_at: datetime,
)->RefreshToken:
    refresh = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at,
    )

    try:
        db.add(refresh)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise


    return refresh

def get_refresh_token(
    db: Session,
    token: str,
):

    refresh = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == token
        )
        .first()
    )


    if not refresh:
        return None


    if refresh.expires_at < datetime.now(timezone.utc):
        db.delete(refresh)
        db.commit()
        return None


    return refresh

def delete_refresh_token(
    db: Session,
    token: str,
):
    refresh = get_refresh_token(db, token)

    if refresh:
        db.delete(refresh)
        db.commit()

def generate_user_tokens(db: Session, user: Authentication):

    payload = {
        "sub": user.id,
        "username": user.username,
        "email": user.email
    }

    access_token = create_access_token(payload)

    refresh_token = create_refresh_token(payload)

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRY_DAYS)
    )

    save_refresh_token(
        db=db,
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at,
    )

    return access_token, refresh_token

def current_user(access_token: str = Cookie(None),db:Session = Depends(get_db)):
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="token_not_found")
    payload = decode_access_token(access_token)
    
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = get_user_by_id(db,int(user_id))

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user

def update_full_name(
    db: Session,
    user_id: int,
    fullname: str,
) -> Authentication:

    user = get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.fullname = clean_text(fullname,case="title")

    try:
        db.commit()
        db.refresh(user)

        return user

    except SQLAlchemyError:
        db.rollback()
        raise



def update_username(
    db: Session,
    user_id: int,
    username: str,
) -> Authentication:
    user = get_user_by_id(db, user_id)
    logger.debug(f"Updating username for user_id: {user_id}")
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    username = username.strip()

    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username cannot be empty.",
        )

    existing_user = get_user_by_username(db, username)

    if existing_user and existing_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists.",
        )

    user.username = username

    try:
        db.commit()
        db.refresh(user)

        return user

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists.",
        )

    except SQLAlchemyError:
        db.rollback()
        raise

def set_user_password(
    db: Session,
    user: Authentication,
    password: str,
):
    if user.hashed_password is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Password already exists. Use change password instead.",
        )

    user.hashed_password = hash_password(password)

    try:
        db.commit()
        db.refresh(user)
    except SQLAlchemyError:
        db.rollback()
        raise

    return user


def change_user_password(
    db: Session,
    user: Authentication,
    current_password: str,
    new_password: str,
):
    if user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password is set for this account. Use set password instead.",
        )
    if not verify_password(
        current_password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    user.hashed_password = hash_password(new_password)

    try:
        db.commit()
        db.refresh(user)
    except SQLAlchemyError:
        db.rollback()
        raise

    return user

def add_prediction_history(
    db: Session,
    weather_data: WeatherAQIPrediction,
    user_id: int,
    prediction: int,
):
    if not get_user_by_id(db, user_id):
        raise ValueError("Account not found for append history")

    new_history = History(
        user_id=user_id,

        temperature_c=weather_data.Temperature_C,
        humidity_pct=weather_data.Humidity_pct,
        wind_speed_kmh=weather_data.WindSpeed_kmh,
        wind_direction_deg=weather_data.WindDirection_deg,
        pressure_hpa=weather_data.Pressure_hPa,
        solar_radiation_wm2=weather_data.SolarRadiation_Wm2,
        rainfall_mm=weather_data.Rainfall_mm,
        traffic_density_index=weather_data.TrafficDensityIndex,
        proximity_industrial_zone_km=weather_data.ProximityIndustrialZone_km,

        day_of_week=weather_data.DayOfWeek,
        month=weather_data.Month,
        is_weekend=weather_data.IsWeekend,

        prediction=prediction,
    )

    db.add(new_history)

    try:
        db.commit()
        db.refresh(new_history)
        return new_history

    except SQLAlchemyError:
        db.rollback()
        raise

def get_user_history(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 10,
)-> tuple[list[History], int]:
    query = db.query(History).filter(History.user_id == user_id)

    total = query.count()

    histories = (
        query.order_by(History.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return histories, total

def get_all_user_history(db: Session, user_id: int):
    query = db.query(History).filter(History.user_id == user_id)
    return query.order_by(History.created_at.desc()).all(),query.count()

def clear_user_history(
    db: Session,
    user_id: int,
):
    deleted = (
        db.query(History)
        .filter(History.user_id == user_id)
        .delete(synchronize_session=False)
    )

    db.commit()

    return deleted

def create_uploaded_file(
    db: Session,
    user_id: int,
    original_name: str,
    file_size: int,
    file_type: str,
    row_count: int,
    prediction_count: int,
) -> UploadedFile:

    if not get_user_by_id(db, user_id):
        raise ValueError("Account not found for uploaded file")

    uploaded_file = UploadedFile(
        user_id=user_id,
        original_name=original_name,
        file_size=file_size,
        file_type=file_type,
        row_count=row_count,
        prediction_count=prediction_count,
    )

    try:
        db.add(uploaded_file)
        db.commit()
        db.refresh(uploaded_file)

        return uploaded_file

    except SQLAlchemyError:
        db.rollback()
        raise

def get_user_uploaded_files(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 10,
) -> tuple[list[UploadedFile], int]:

    query = (
        db.query(UploadedFile)
        .filter(UploadedFile.user_id == user_id)
    )

    total = query.count()

    files = (
        query
        .order_by(UploadedFile.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return files, total

def delete_user_uploaded_file(
    db: Session,
    user_id: int,
    file_id: int,
) -> bool:

    uploaded_file = (
        db.query(UploadedFile)
        .filter(
            UploadedFile.id == file_id,
            UploadedFile.user_id == user_id,
        )
        .first()
    )

    if not uploaded_file:
        return False

    db.delete(uploaded_file)
    db.commit()

    return True

def delete_all_user_uploaded_files(
    db: Session,
    user_id: int,
) -> int:
    deleted_count = (
        db.query(UploadedFile)
        .filter(UploadedFile.user_id == user_id)
        .delete(synchronize_session=False)
    )

    db.commit()

    return deleted_count


def delete_user(db: Session, user_id: int):
    user = get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    try:
        db.query(History).filter(
            History.user_id == user_id
        ).delete(synchronize_session=False)

        db.query(UploadedFile).filter(
            UploadedFile.user_id == user_id
        ).delete(synchronize_session=False)

        db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id
        ).delete(synchronize_session=False)

        db.delete(user)

        db.commit()

    except SQLAlchemyError:
        db.rollback()
        raise

def delete_all_user_history(
    db: Session,
    user_id: int,
) -> tuple[int, int]:

    prediction_deleted = (
        db.query(History)
        .filter(History.user_id == user_id)
        .delete(synchronize_session=False)
    )

    files_deleted = (
        db.query(UploadedFile)
        .filter(UploadedFile.user_id == user_id)
        .delete(synchronize_session=False)
    )

    db.commit()

    return prediction_deleted, files_deleted