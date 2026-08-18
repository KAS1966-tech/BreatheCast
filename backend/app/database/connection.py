import sqlalchemy as sa
from sqlalchemy.orm import DeclarativeBase,Mapped,mapped_column,relationship
from app.core.config import settings
from datetime import datetime
from decimal import Decimal

class Base(DeclarativeBase):
    pass

class Authentication(Base):
    __tablename__ = settings.TABLE_NAME_AUTH

    id: Mapped[int] = mapped_column(
        sa.Integer,
        primary_key=True,
        autoincrement=True
    )

    google_id: Mapped[str | None] = mapped_column(
    sa.String(255),
    unique=True,
    nullable=True,
    index=True,
    )

    fullname: Mapped[str] = mapped_column(
        sa.String(settings.SHORT_STR),
        unique=False,
        nullable=False
    )

    username: Mapped[str] = mapped_column(
        sa.String(settings.SHORT_STR),
        unique=True,
        nullable=False,
        index=True
    )

    email: Mapped[str] = mapped_column(
        sa.String(settings.LONG_STR),
        unique=True,
        nullable=False,
        index=True
    )

    hashed_password: Mapped[str | None] = mapped_column(
        sa.String(settings.LONG_STR),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
    sa.DateTime(timezone=True),
    server_default=sa.func.now(),
    nullable=False,
    index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False,
    )

    history: Mapped[list["History"]] = relationship(
    back_populates="user",
    cascade="all, delete-orphan",
    passive_deletes=True)

    uploaded_files: Mapped[list["UploadedFile"]] = relationship(
    back_populates="user",
    cascade="all, delete-orphan",
    passive_deletes=True)
    
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
    back_populates="user",
    cascade="all, delete-orphan",
    passive_deletes=True)
    
    def __repr__(self)->str:
        return f"<Authentication(id={self.id}, username={self.username})>"

class History(Base):
    __tablename__ = settings.TABLE_NAME_HISTORY

    # ==========================
    # Primary Key
    # ==========================

    id: Mapped[int] = mapped_column(
        sa.BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    # ==========================
    # User Relationship
    # ==========================

    user_id: Mapped[int] = mapped_column(
        sa.ForeignKey(
            f"{settings.TABLE_NAME_AUTH}.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ==========================
    # Input Features
    # ==========================

    temperature_c: Mapped[Decimal] = mapped_column(
        sa.Numeric(5, 2),
        nullable=False,
    )

    humidity_pct: Mapped[Decimal] = mapped_column(
        sa.Numeric(5, 2),
        nullable=False,
    )

    wind_speed_kmh: Mapped[Decimal] = mapped_column(
        sa.Numeric(5, 2),
        nullable=False,
    )

    wind_direction_deg: Mapped[Decimal] = mapped_column(
        sa.Numeric(6, 2),
        nullable=False,
    )

    pressure_hpa: Mapped[Decimal] = mapped_column(
        sa.Numeric(6, 2),
        nullable=False,
    )

    solar_radiation_wm2: Mapped[Decimal] = mapped_column(
        sa.Numeric(6, 2),
        nullable=False,
    )

    rainfall_mm: Mapped[Decimal] = mapped_column(
        sa.Numeric(6, 2),
        nullable=False,
    )

    traffic_density_index: Mapped[Decimal] = mapped_column(
        sa.Numeric(5, 2),
        nullable=False,
    )

    proximity_industrial_zone_km: Mapped[Decimal] = mapped_column(
        sa.Numeric(5, 2),
        nullable=False,
    )

    day_of_week: Mapped[int] = mapped_column(
        sa.SmallInteger,
        nullable=False,
    )

    month: Mapped[int] = mapped_column(
        sa.SmallInteger,
        nullable=False,
    )

    is_weekend: Mapped[bool] = mapped_column(
        sa.Boolean,
        nullable=False,
    )

    # ==========================
    # Prediction
    # ==========================

    prediction: Mapped[int] = mapped_column(
        sa.Integer,
        nullable=False,
    )

    # ==========================
    # Timestamps
    # ==========================

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False,
    )

    # ==========================
    # Relationship
    # ==========================

    user: Mapped["Authentication"] = relationship(
        back_populates="history"
    )

    # ==========================
    # Constraints & Indexes
    # ==========================

    __table_args__ = (
        sa.CheckConstraint(
            "temperature_c BETWEEN -7 AND 40",
            name="ck_history_temperature",
        ),
        sa.CheckConstraint(
            "humidity_pct BETWEEN 25 AND 100.0",
            name="ck_history_humidity",
        ),
        sa.CheckConstraint(
            "wind_speed_kmh BETWEEN 0.03 AND 54.33",
            name="ck_history_wind_speed",
        ),
        sa.CheckConstraint(
            "wind_direction_deg BETWEEN 0 AND 360",
            name="ck_history_wind_direction",
        ),
        sa.CheckConstraint(
            "pressure_hpa BETWEEN 985 AND 1040",
            name="ck_history_pressure",
        ),
        sa.CheckConstraint(
            "solar_radiation_wm2 BETWEEN 0 AND 793.5",
            name="ck_history_solar_radiation",
        ),
        sa.CheckConstraint(
            "rainfall_mm BETWEEN 0 AND 54.34",
            name="ck_history_rainfall",
        ),
        sa.CheckConstraint(
            "traffic_density_index BETWEEN 0 AND 96.72",
            name="ck_history_traffic_density",
        ),
        sa.CheckConstraint(
            "proximity_industrial_zone_km BETWEEN 0.2 AND 20",
            name="ck_history_industrial_distance",
        ),
        sa.CheckConstraint(
            "day_of_week BETWEEN 0 AND 6",
            name="ck_history_day_of_week",
        ),
        sa.CheckConstraint(
            "month BETWEEN 1 AND 12",
            name="ck_history_month",
        ),
        sa.Index(
            "ix_history_user_created",
            "user_id",
            "created_at",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<History("
            f"id={self.id}, "
            f"user_id={self.user_id}, "
            f"prediction={self.prediction})>"
        )


class UploadedFile(Base):
    __tablename__ = settings.TABLE_NAME_UPLOADED_FILE

    # ==========================
    # Primary Key
    # ==========================

    id: Mapped[int] = mapped_column(
        sa.BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    # ==========================
    # User Relationship
    # ==========================

    user_id: Mapped[int] = mapped_column(
        sa.ForeignKey(
            f"{settings.TABLE_NAME_AUTH}.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ==========================
    # File Information
    # ==========================

    original_name: Mapped[str] = mapped_column(
        sa.String(255),
        nullable=False,
    )

    file_size: Mapped[int] = mapped_column(
        sa.BigInteger,
        nullable=False,
    )

    file_type: Mapped[str] = mapped_column(
        sa.String(100),
        nullable=False,
    )

    # ==========================
    # Prediction Information
    # ==========================

    row_count: Mapped[int] = mapped_column(
        sa.Integer,
        nullable=False,
    )

    prediction_count: Mapped[int] = mapped_column(
        sa.Integer,
        nullable=False,
    )

    # ==========================
    # Timestamp
    # ==========================

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
        index=True,
    )

    # ==========================
    # Relationship
    # ==========================

    user: Mapped["Authentication"] = relationship(
        back_populates="uploaded_files"
    )

    # ==========================
    # Constraints & Indexes
    # ==========================

    __table_args__ = (
        sa.CheckConstraint(
            "file_size > 0",
            name="ck_uploaded_file_size",
        ),

        sa.CheckConstraint(
            "row_count > 0",
            name="ck_uploaded_file_row_count",
        ),

        sa.CheckConstraint(
            "prediction_count >= 0",
            name="ck_uploaded_file_prediction_count",
        ),

        sa.Index(
            "ix_uploaded_file_user_created",
            "user_id",
            "created_at",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<UploadedFile("
            f"id={self.id}, "
            f"user_id={self.user_id}, "
            f"original_name={self.original_name}, "
            f"row_count={self.row_count}, "
            f"prediction_count={self.prediction_count})>"
        )


class RefreshToken(Base):
    __tablename__ = settings.TABLE_NAME_REFRESH_TOKEN

    id: Mapped[int] = mapped_column(
        sa.Integer,
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        sa.ForeignKey(
            f"{settings.TABLE_NAME_AUTH}.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    token: Mapped[str] = mapped_column(
        sa.Text,
        nullable=False,
        unique=True,
        index=True,
    )

    expires_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    )

    user: Mapped["Authentication"] = relationship(
        back_populates="refresh_tokens"
    )

    def __repr__(self):
        return f"<RefreshToken(id={self.id}, user_id={self.user_id})>"

class EmailOTP(Base):
    __tablename__ = "email_otps"

    id: Mapped[int] = mapped_column(
        sa.Integer,
        primary_key=True,
        autoincrement=True,
    )

    email: Mapped[str] = mapped_column(
        sa.String(settings.LONG_STR),
        nullable=False,
        index=True,
    )

    otp_hash: Mapped[str] = mapped_column(
        sa.String(settings.LONG_STR),
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
    )

    attempts: Mapped[int] = mapped_column(
        sa.SmallInteger,
        nullable=False,
        default=0,
    )

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    )

    __table_args__ = (
        sa.Index(
            "ix_email_otps_email_created",
            "email",
            "created_at",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<EmailOTP("
            f"id={self.id}, "
            f"email={self.email})>"
        )

class PendingSignup(Base):
    __tablename__ = "pending_signups"

    id: Mapped[int] = mapped_column(
            sa.Integer,
            primary_key=True,
            autoincrement=True
        )

    fullname: Mapped[str] = mapped_column(
            sa.String(settings.SHORT_STR),
            unique=False,
            nullable=False
        )
    
    username: Mapped[str] = mapped_column(
        sa.String(settings.SHORT_STR),
        unique=True,
        nullable=False,
        index=True
    )

    email: Mapped[str] = mapped_column(
        sa.String(settings.LONG_STR),
        unique=True,
        nullable=False,
        index=True
    )

    hashed_password: Mapped[str | None] = mapped_column(
            sa.String(settings.LONG_STR),
            nullable=True
        )

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
        index=True,
        )

    expires_at: Mapped[datetime] = mapped_column(
            sa.DateTime(timezone=True),
            nullable=False,
        )