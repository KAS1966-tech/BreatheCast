# =====================================================================
# 1. Standard Library & Third-Party Core Modules
# =====================================================================
import io
import pandas as pd
from datetime import datetime, timedelta, timezone
from fastapi import (
    APIRouter, 
    Depends, 
    File, 
    HTTPException, 
    Request, 
    Response, 
    UploadFile, 
    status
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

# =====================================================================
# 2. System Core Configurations & Logging
# =====================================================================
from app.core.config import settings
from app.core.logger import logger

# =====================================================================
# 3. Pydantic Schemas (Inputs vs Outputs)
# =====================================================================
from app.schemas.input_schemas import LoginRequest, SetPasswordRequest, SignupRequest, WeatherAQIPrediction,GoogleLoginRequest,UpdateNameRequest, UpdateUsernameRequest,ChangePasswordRequest,SendOTPRequest, VerifyOTPRequest
from app.schemas.output_schemas import LoginResponse, PredictionResponse, SignupResponse, User,GoogleLoginResponse
from pydantic import ValidationError

# =====================================================================
# 4. Database Layer (Connection, Operations & Lifecycle)
# =====================================================================
from app.database.database import get_db
from app.database.connection import Authentication,PendingSignup
from app.database.crud_db import (
    add_prediction_history,
    create_uploaded_file,
    create_user,
    current_user,
    delete_refresh_token,
    delete_user,
    generate_user_tokens,
    get_refresh_token,
    get_user_by_id,
    verify_user,
    get_or_create_google_user,
    get_user_history,
    clear_user_history,
    get_all_user_history,
    get_user_uploaded_files,
    update_full_name,
    update_username,
    set_user_password,
    change_user_password,
    get_user_by_email,
    get_user_by_username
)

# =====================================================================
# Google OAuth
# ====================================================================
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# =====================================================================
# 5. Business Logic, ML Services & Core Artifacts
# =====================================================================
from app.core.artifact import modelService
from app.services.predictor import predict,predict_batch
from app.services.security import decode_refresh_token,hash_password
from app.services.email_service import send_otp_email
from app.services.otp import create_otp,verify_otp


router = APIRouter()

# Authentication

@router.post("/auth/verify-signup-otp")
def verify_signup_otp(
    payload: VerifyOTPRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    try:

        # ==========================
        # Verify OTP
        # ==========================

        verify_otp(
            db=db,
            email=payload.email,
            otp=payload.otp,
        )

        # ==========================
        # Find pending signup
        # ==========================

        pending_signup = (
            db.query(PendingSignup)
            .filter(
                PendingSignup.email == payload.email
            )
            .first()
        )

        if not pending_signup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signup session not found or expired.",
            )

        # ==========================
        # Check expiration
        # ==========================

        if pending_signup.expires_at < datetime.now(timezone.utc):
            db.delete(pending_signup)
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signup session has expired. Please sign up again.",
            )

        # ==========================
        # Create actual user
        # ==========================

        user = Authentication(
            fullname=pending_signup.fullname,
            username=pending_signup.username,
            email=pending_signup.email,
            hashed_password=pending_signup.hashed_password,
        )

        db.add(user)
        db.flush()

        # ==========================
        # Generate tokens
        # ==========================

        access_token, refresh_token = generate_user_tokens(
            db,
            user,
        )

        # Remove pending signup
        db.delete(pending_signup)

        db.commit()
        db.refresh(user)

        # ==========================
        # Set cookies
        # ==========================

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            samesite="lax",
            secure=settings.IS_PROD,
            max_age=settings.ACCESS_TOKEN_EXPIRY_MINUTES * 60,
            path="/",
        )

        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            samesite="lax",
            secure=settings.IS_PROD,
            max_age=settings.REFRESH_TOKEN_EXPIRY_DAYS * 86400,
            path="/",
        )

        return {
            "status": "success",
            "message": "Account created successfully.",
            "user": {
                "id": user.id,
                "fullname": user.fullname,
                "email": user.email,
                "username": user.username,
                "created_at": user.created_at,
            },
        }

    except HTTPException:
        raise

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already exists.",
        )

    except Exception as e:
        db.rollback()

        logger.exception(
            f"Signup OTP verification failed | email={payload.email}"
        )

        error = (
            str(e)
            if settings.DEBUG
            else settings.ERROR_MESSAGE
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error,
        )

@router.post("/signup")
def sign_up(
    SignUpForm: SignupRequest,
    db: Session = Depends(get_db),
):
    try:

        # Existing account
        if get_user_by_email(db, SignUpForm.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        # Existing username
        if get_user_by_username(db, SignUpForm.username):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists.",
            )

        # Store pending signup
        pending_signup = PendingSignup(
            email=SignUpForm.email,
            fullname=SignUpForm.fullname,
            username=SignUpForm.username,
            hashed_password=hash_password(SignUpForm.password),
            expires_at=(
                datetime.now(timezone.utc)
                + timedelta(minutes=10)
            ),
        )

        db.add(pending_signup)

        # Generate OTP
        otp = create_otp(
            db=db,
            email=SignUpForm.email,
        )

        db.commit()

        # Send OTP
        send_otp_email(
            recipient_email=SignUpForm.email,
            otp=otp,
        )

        return {
            "status": "otp_required",
            "message": "Verification code sent successfully.",
        }

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()

        logger.exception("Signup failed")

        error = (
            str(e)
            if settings.DEBUG
            else settings.ERROR_MESSAGE
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error,
        )

@router.post("/login",response_model=LoginResponse)
def login(response : Response,formdata:LoginRequest,db:Session = Depends(get_db)):
    try:
        user_credientials = verify_user(db,formdata)
        response.set_cookie(
            key="access_token",
            value=user_credientials["access_token"],
            httponly=True,
            samesite="lax",
            secure=settings.IS_PROD,
            max_age=settings.ACCESS_TOKEN_EXPIRY_MINUTES * 60,
            path="/"
        )

        response.set_cookie(
            key="refresh_token",
            value=user_credientials["refresh_token"],
            httponly=True,
            samesite="lax",
            secure=settings.IS_PROD,
            max_age=settings.REFRESH_TOKEN_EXPIRY_DAYS * 86400,
            path="/"
        )

        return user_credientials
    except HTTPException:
        logger.exception("Login failed")
        raise
    except Exception as e:
        logger.exception("Login failed")
        error = str(e) if settings.DEBUG else settings.ERROR_MESSAGE
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail=error)

@router.post("/auth/google", response_model=GoogleLoginResponse)
def google_login(
    response: Response,
    formdata: GoogleLoginRequest,
    db: Session = Depends(get_db),
):
    try:
        google_user = id_token.verify_oauth2_token(
            formdata.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )

        google_id = google_user.get("sub")
        email = google_user.get("email")
        email_verified = google_user.get("email_verified")
        fullname = google_user.get("name")

        if not google_id or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google account information.",
            )

        if not email_verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google email is not verified.",
            )

        if not fullname:
            fullname = email.split("@")[0]

        user = get_or_create_google_user(
            db=db,
            google_id=google_id,
            email=email,
            fullname=fullname,
        )

        access_token, refresh_token = generate_user_tokens(
            db,
            user,
        )

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            samesite="lax",
            secure=settings.IS_PROD,
            max_age=settings.ACCESS_TOKEN_EXPIRY_MINUTES * 60,
            path="/",
        )

        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            samesite="lax",
            secure=settings.IS_PROD,
            max_age=settings.REFRESH_TOKEN_EXPIRY_DAYS * 86400,
            path="/",
        )

        return {
            "status": "success",
            "user": {
                "id": user.id,
                "username": user.username,
                "fullname": user.fullname,
                "email": user.email,
                "created_at": user.created_at,
            },
        }

    except HTTPException:
        logger.exception("Google login failed")
        raise

    except ValueError:
        logger.exception("Invalid Google ID token")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google authentication.",
        )

    except Exception as e:
        logger.exception("Google login failed")

        error = (
            str(e)
            if settings.DEBUG
            else settings.ERROR_MESSAGE
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error,
        )
    
@router.post("/refresh")
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):

    old_token = request.cookies.get("refresh_token")

    if not old_token:
        raise HTTPException(
            status_code=401,
            detail="Refresh token missing"
        )


    stored = get_refresh_token(
        db,
        old_token
    )

    if not stored:
        raise HTTPException(
            status_code=401,
            detail="Refresh token revoked"
        )

    payload = decode_refresh_token(old_token)



    user = get_user_by_id(
        db,
        int(payload["id"])
    )

    if not user:
        raise HTTPException(
        status_code=401,
        detail="User not found"
    )

    delete_refresh_token(db,old_token)

    access_token, refresh_token = generate_user_tokens(
        db,
        user
    )


    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.IS_PROD,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRY_MINUTES * 60,
        path="/",
    )


    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.IS_PROD,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRY_DAYS * 86400,
        path="/",
    )


    return {
        "message": "Token refreshed"
    }

@router.post("/logout")
def logout(
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    refresh_token = request.cookies.get("refresh_token")
    
    if refresh_token:
        try:
            delete_refresh_token(db, refresh_token)
        except Exception:
            pass 

    cookie_kwargs = {
        "httponly": True,
        "secure": settings.IS_PROD,
        "samesite": "lax",
        "path": "/",
    }

    # 3. Explicitly delete cookies by passing the configuration
    response.delete_cookie(key="access_token", **cookie_kwargs)
    response.delete_cookie(key="refresh_token", **cookie_kwargs)

    return {
        "status": "success",
        "message": "Logged out successfully",
    }

# Current User / Account
@router.get("/me",response_model=User)
def get_me(user = Depends(current_user)):
    return user

@router.delete("/me", status_code=status.HTTP_200_OK)
def delete_account(
    response: Response,
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    delete_user(db, user.id)

    response.delete_cookie(
        key="access_token",
        path="/",
    )

    response.delete_cookie(
        key="refresh_token",
        path="/",
    )

    return {
        "message": "Account deleted successfully"
    }

@router.get("/profile")
def get_profile(
    user: Authentication = Depends(current_user),
    db: Session = Depends(get_db),
):
    histories, history_total = get_all_user_history(
        db=db,
        user_id=user.id,
    )

    files, file_total = get_user_uploaded_files(
        db=db,
        user_id=user.id,
    )

    return {
        "user": {
            "id": user.id,
            "fullname": user.fullname,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at,
            "has_password": user.hashed_password is not None,
        },
        "history": {
            "total": history_total,
            "items": histories,
        },
        "files": {
            "total": file_total,
            "items": files,
        },
    }

@router.patch("/profile/name")
def update_name(
    payload: UpdateNameRequest,
    user: Authentication = Depends(current_user),
    db: Session = Depends(get_db),
):
    try:
        fullname = payload.fullname.strip()

        if not fullname:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name cannot be empty.",
            )

        updated_user = update_full_name(
            db=db,
            user_id=user.id,
            fullname=fullname,
        )

        return {
            "status": "success",
            "message": "Name updated successfully.",
            "user": {
                "id": updated_user.id,
                "fullname": updated_user.fullname,
                "username": updated_user.username,
                "email": updated_user.email,
                "created_at": updated_user.created_at,
            },
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("Name update failed")

        error = (
            str(e)
            if settings.DEBUG
            else settings.ERROR_MESSAGE
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error,
        )

@router.patch("/profile/username")
def update_username(
    payload: UpdateUsernameRequest,
    user: Authentication = Depends(current_user),
    db: Session = Depends(get_db),
):
    try:
        username = payload.username.strip()

        if not username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username cannot be empty.",
            )

        updated_user = update_username(
            db=db,
            user_id=user.id,
            username=username,
        )

        return {
            "status": "success",
            "message": "Username updated successfully.",
            "user": {
                "id": updated_user.id,
                "fullname": updated_user.fullname,
                "username": updated_user.username,
                "email": updated_user.email,
                "created_at": updated_user.created_at,
            },
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("Username update failed")

        error = (
            str(e)
            if settings.DEBUG
            else settings.ERROR_MESSAGE
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error,
        )

# Password
@router.post("/password/set")
def set_password(
    formdata: SetPasswordRequest,
    user: Authentication = Depends(current_user),
    db: Session = Depends(get_db),
):
    try:
        set_user_password(
            db=db,
            user=user,
            password=formdata.password,
        )

        return {
            "status": "success",
            "message": "Password set successfully.",
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("Failed to set password")

        error = (
            str(e)
            if settings.DEBUG
            else settings.ERROR_MESSAGE
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error,
        )

@router.patch("/password/change")
def change_password(
    formdata: ChangePasswordRequest,
    user: Authentication = Depends(current_user),
    db: Session = Depends(get_db),
):
    try:
        change_user_password(
            db=db,
            user=user,
            current_password=formdata.current_password,
            new_password=formdata.new_password,
        )

        return {
            "status": "success",
            "message": "Password changed successfully.",
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("Failed to change password")

        error = (
            str(e)
            if settings.DEBUG
            else settings.ERROR_MESSAGE
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error,
        )

# Prediction
@router.post(
    "/predict",
    response_model=PredictionResponse,
)
def predict_aqi(
    payload: WeatherAQIPrediction,
    user: Authentication = Depends(current_user),
    db: Session = Depends(get_db),
):
    try:
        prediction = predict(payload.model_dump())[0]

        logger.info(
            f"AQI prediction generated successfully | "
            f"user_id={user.id} | prediction={prediction}"
        )

        add_prediction_history(
            db=db,
            weather_data=payload,
            user_id=user.id,
            prediction=int(round(prediction)),
        )

        return PredictionResponse(
            prediction=prediction
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e) if settings.DEBUG else settings.ERROR_MESSAGE,
        )

    except Exception as e:
        logger.exception("AQI prediction failed")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e) if settings.DEBUG else settings.ERROR_MESSAGE,
        )

@router.get("/metrics")
def get_metrics():
    return modelService.load_metadata()["metrics"]

# Prediction History
@router.get("/history")
def history(
    skip: int = 0,
    limit: int = 10,
    user: Authentication = Depends(current_user),
    db: Session = Depends(get_db),
):
    histories, total = get_user_history(
        db=db,
        user_id=user.id,
        skip=skip,
        limit=limit,
    )

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "history": histories,
    }

@router.delete("/history")
def clear_history(
    user: Authentication = Depends(current_user),
    db: Session = Depends(get_db),
):
    deleted_count = clear_user_history(
        db=db,
        user_id=user.id,
    )

    return {
        "status": "success",
        "message": "Prediction history cleared successfully.",
        "deleted_count": deleted_count,
    }

@router.get("/history/download")
def download_history(
    user: Authentication = Depends(current_user),
    db: Session = Depends(get_db),
):
    histories, _ = get_all_user_history(
        db=db,
        user_id=user.id,
    )

    if not histories:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No prediction history found.",
        )

    rows = [
            {
                "id": history.id,
                "Temperature_C": history.temperature_c,
                "Humidity_pct": history.humidity_pct,
                "WindSpeed_kmh": history.wind_speed_kmh,
                "WindDirection_deg": history.wind_direction_deg,
                "Pressure_hPa": history.pressure_hpa,
                "SolarRadiation_Wm2": history.solar_radiation_wm2,
                "Rainfall_mm": history.rainfall_mm,
                "TrafficDensityIndex": history.traffic_density_index,
                "ProximityIndustrialZone_km": history.proximity_industrial_zone_km,
                "DayOfWeek": history.day_of_week,
                "Month": history.month,
                "IsWeekend": history.is_weekend,
                "prediction": history.prediction,
                "created_at": history.created_at,
            }
            for history in histories
]

    df = pd.DataFrame(rows)

    output_buffer = io.BytesIO()

    df.to_csv(
        output_buffer,
        index=False,
    )

    output_buffer.seek(0)

    return StreamingResponse(
        output_buffer,
        media_type="text/csv",
        headers={
            "Content-Disposition": (
                'attachment; filename="aqi_prediction_history.csv"'
            )
        },
    )


@router.post("/fileupload")
async def upload_file(
    dataFile: UploadFile = File(...),
    user: Authentication = Depends(current_user),
    db: Session = Depends(get_db),
):
    # ==========================
    # File validation
    # ==========================

    if not dataFile.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File name is required.",
        )

    if not dataFile.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported.",
        )

    try:
        # ==========================
        # Read uploaded file
        # ==========================

        contents = await dataFile.read()

        if not contents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is empty.",
            )

        # ==========================
        # File size validation
        # ==========================

        max_file_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

        if len(contents) > max_file_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=(
                    f"File size exceeds the maximum allowed "
                    f"limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
                ),
            )

        # ==========================
        # Read CSV
        # ==========================

        try:
            df = pd.read_csv(io.BytesIO(contents))
        except pd.errors.EmptyDataError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The CSV file does not contain any data.",
            )
        except pd.errors.ParserError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The CSV file could not be parsed.",
            )

        # ==========================
        # Basic dataframe validation
        # ==========================

        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The CSV file contains no data rows.",
            )

        if len(df.columns) != len(set(df.columns)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The CSV file contains duplicate column names.",
            )

        # ==========================
        # Required columns
        # ==========================

        required_columns = set(modelService.model_artifact_info("features"))

        # Computed by Pydantic and therefore does not need
        # to be supplied by the CSV file.
        computed_features = {
            "IsWeekend",
        }

        required_input_columns = required_columns - computed_features

        uploaded_columns = set(df.columns)

        missing_columns = required_input_columns - uploaded_columns

        if missing_columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "CSV is missing required columns.",
                    "missing_columns": sorted(missing_columns),
                },
            )

        # ==========================
        # Validate rows
        # ==========================

        valid_payloads = []
        valid_indices = []

        predictions = [None] * len(df)
        statuses = ["skipped"] * len(df)
        messages = ["Prediction not permissible for this row."] * len(df)

        for position, (index, row) in enumerate(df.iterrows()):

            try:
                payload = WeatherAQIPrediction(
                    **row.to_dict()
                )

                valid_payloads.append(payload.model_dump())
                valid_indices.append(position)

            except Exception as row_error:

                logger.warning(
                    f"CSV row skipped | "
                    f"row={index + 2} | "
                    f"reason={str(row_error)}"
                )

                if isinstance(row_error,ValidationError):
                    error = row_error.errors()[0]

                    messages[position] = (
                        f"Prediction not permissible: {error['msg']}"
                    )
                else:
                    messages[position] = (
                        f"Prediction not permissible: {str(row_error)}"
                    )


        # ==========================
        # Batch prediction
        # ==========================

        if valid_payloads:

            try:
                batch_predictions = predict_batch(valid_payloads)

                for position, prediction in zip(valid_indices, batch_predictions):

                    predictions[position] = prediction
                    statuses[position] = "success"
                    messages[position] = "Prediction generated successfully."

            except Exception as prediction_error:

                logger.exception(
                    f"Batch prediction failed | "
                    f"user_id={user.id} | "
                    f"error={prediction_error}"
                )

                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Unable to generate predictions for the uploaded file.",
                )


        # ==========================
        # Count results
        # ==========================

        successful_predictions = sum(
            status == "success"
            for status in statuses
        )

        failed_predictions = len(df) - successful_predictions


        # ==========================
        # Reject if ALL rows failed
        # ==========================

        if successful_predictions == 0:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": (
                        "No predictions could be generated. "
                        "Every row contains invalid or unsupported data."
                    ),
                    "total_rows": len(df),
                    "successful_predictions": 0,
                    "failed_predictions": failed_predictions,
                },
            )

        # ==========================
        # Add prediction results
        # ==========================

        df["prediction"] = predictions
        df["status"] = statuses
        df["message"] = messages

        # ==========================
        # Save generated CSV
        # ==========================

        output_buffer = io.BytesIO()

        df.to_csv(
            output_buffer,
            index=False,
        )

        output_buffer.seek(0)

        # ==========================
        # Save upload metadata
        # ==========================

        uploaded_file = create_uploaded_file(
            db=db,
            user_id=user.id,
            original_name=dataFile.filename,
            file_size=len(contents),
            file_type=dataFile.content_type or "text/csv",
            row_count=len(df),
            prediction_count=successful_predictions,
        )

        logger.info(
            "CSV prediction completed | "
            f"user_id={user.id} | "
            f"file_id={uploaded_file.id} | "
            f"filename={dataFile.filename} | "
            f"total_rows={len(df)} | "
            f"successful={successful_predictions} | "
            f"skipped={failed_predictions}"
        )

        # ==========================
        # Return predicted CSV
        # ==========================

        return StreamingResponse(
            output_buffer,
            media_type="text/csv",
            headers={
                "Content-Disposition": (
                    f'attachment; '
                    f'filename="predicted_{dataFile.filename}"'
                )
            },
        )

    except HTTPException:
        raise

    except pd.errors.ParserError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid CSV format.",
        )

    except Exception as e:
        db.rollback()

        logger.exception(
            f"File prediction failed | "
            f"user_id={user.id} | "
            f"filename={dataFile.filename}"
        )

        detail = (
            str(e)
            if settings.DEBUG
            else settings.ERROR_MESSAGE
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
        )