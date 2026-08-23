from typing import Annotated
from pydantic import BaseModel, Field, BeforeValidator, computed_field,field_validator
from app.core.artifact import modelService


# ============================================================
# Day Of Week
# ============================================================

def convert_day_of_week(v: object) -> int:

    if isinstance(v, bool):
        raise ValueError(
            "Day of week cannot be a boolean value"
        )

    if isinstance(v, int):

        if 0 <= v <= 6:
            return v

        raise ValueError(
            "Day of week must be between 0 and 6"
        )

    if isinstance(v, float):

        if v.is_integer() and 0 <= v <= 6:
            return int(v)

        raise ValueError(
            "Day of week must be an integer between 0 and 6"
        )

    if isinstance(v, str):

        val = v.strip().lower()

        mapping = {
            "0": 0,
            "1": 1,
            "2": 2,
            "3": 3,
            "4": 4,
            "5": 5,
            "6": 6,
            "monday": 0,
            "mon": 0,
            "tuesday": 1,
            "tue": 1,
            "tues": 1,
            "wednesday": 2,
            "wed": 2,
            "thursday": 3,
            "thu": 3,
            "thur": 3,
            "thurs": 3,
            "friday": 4,
            "fri": 4,
            "saturday": 5,
            "sat": 5,
            "sunday": 6,
            "sun": 6,
        }

        if val in mapping:
            return mapping[val]

    raise ValueError(
        "Input must be a valid day of week "
        "(0-6, Monday-Sunday)"
    )


dayOfWeekToInt = Annotated[
    int,
    BeforeValidator(convert_day_of_week),
    Field(ge=0, le=6),
]


# ============================================================
# Month
# ============================================================

def convert_month(v: object) -> int:

    if isinstance(v, bool):
        raise ValueError(
            "Month cannot be a boolean value"
        )

    if isinstance(v, int):

        if 1 <= v <= 12:
            return v

        raise ValueError(
            "Month must be between 1 and 12"
        )

    if isinstance(v, float):

        if v.is_integer() and 1 <= v <= 12:
            return int(v)

        raise ValueError(
            "Month must be an integer between 1 and 12"
        )

    if isinstance(v, str):

        val = v.strip().lower()

        mapping = {
            "1": 1,
            "2": 2,
            "3": 3,
            "4": 4,
            "5": 5,
            "6": 6,
            "7": 7,
            "8": 8,
            "9": 9,
            "10": 10,
            "11": 11,
            "12": 12,
            "january": 1,
            "jan": 1,
            "february": 2,
            "feb": 2,
            "march": 3,
            "mar": 3,
            "april": 4,
            "apr": 4,
            "may": 5,
            "june": 6,
            "jun": 6,
            "july": 7,
            "jul": 7,
            "august": 8,
            "aug": 8,
            "september": 9,
            "sep": 9,
            "sept": 9,
            "october": 10,
            "oct": 10,
            "november": 11,
            "nov": 11,
            "december": 12,
            "dec": 12,
        }

        if val in mapping:
            return mapping[val]

    raise ValueError(
        "Input must be a valid month "
        "(1-12, January-December)"
    )


monthToInt = Annotated[
    int,
    BeforeValidator(convert_month),
    Field(ge=1, le=12,examples=[1]),
]


# ============================================================
# Prediction Schema
# ============================================================

class WeatherAQIPrediction(BaseModel):

    # --------------------------------------------------------
    # Numerical Features
    # --------------------------------------------------------

    Temperature_C: Annotated[
        float,
        Field(
            ge=-7,
            le=40,
            description="Temperature in Celsius",
            examples=[-6.68]
        ),
    ]

    Humidity_pct: Annotated[
        float,
        Field(
            ge=25,
            le=100.0,
            description="Relative humidity percentage",
            examples=[26.65]
        ),
    ]

    WindSpeed_kmh: Annotated[
        float,
        Field(
            ge=0.03,
            le=54.33,
            description="Wind speed in km/h",
        ),
    ]

    WindDirection_deg: Annotated[
        float,
        Field(
            ge=0.0,
            le=360.0,
            description="Wind direction in degrees",
        ),
    ]

    Pressure_hPa: Annotated[
        float,
        Field(
            ge=985.0,
            le=1040.0,
            description="Atmospheric pressure in hPa",
        ),
    ]

    SolarRadiation_Wm2: Annotated[
        float,
        Field(
            ge=0.0,
            le=793.5,
            description="Solar radiation in W/m²",
        ),
    ]

    Rainfall_mm: Annotated[
        float,
        Field(
            ge=0.0,
            le=54.34,
            description="Rainfall in millimeters",
        ),
    ]

    TrafficDensityIndex: Annotated[
        float,
        Field(
            ge=0.0,
            le=96.72,
            description="Traffic density index",
        ),
    ]

    ProximityIndustrialZone_km: Annotated[
        float,
        Field(
            ge=0.2,
            le=20.0,
            description="Distance from industrial zone in kilometers",
        ),
    ]

    # --------------------------------------------------------
    # Categorical Features
    # --------------------------------------------------------

    DayOfWeek: dayOfWeekToInt

    Month: monthToInt

    # --------------------------------------------------------
    # Computed Feature
    # --------------------------------------------------------

    @computed_field
    @property
    def IsWeekend(self) -> int:
        return int(self.DayOfWeek in (5, 6))

class SignupRequest(BaseModel):
    fullname: Annotated[
        str,
        Field(
            min_length=2,
            max_length=50,
            examples=["John Doe"],
        ),
    ]

    username: Annotated[
        str,
        Field(
            min_length=2,
            max_length=50,
            examples=["@user26"],
        ),
    ]

    email: Annotated[
        str,
        Field(
            min_length=5,
            max_length=50,
            examples=["user@gmail.com"],
        ),
    ]

    password: Annotated[
        str,
        Field(
            min_length=8,
            examples=["Password@123"],
        ),
    ]

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not modelService.validate_email(value):
            raise ValueError("Invalid email address.")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not modelService.validate_password(value):
            raise ValueError(
                "Password must contain at least one uppercase letter, "
                "one lowercase letter, one digit, one special character, "
                "and be at least 8 characters long."
            )
        return value

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if not value.startswith("@"):
            value = "@" + value

        if not modelService.validate_username(value):
            raise ValueError(
                "Username must start with @ and contain only "
                "letters, numbers, and underscores."
            )

        return value

class LoginRequest(BaseModel):
    email: Annotated[str,Field(min_length=5,max_length=50,examples=["user@gmail.com"])]
    password : Annotated[str,Field(min_length=8,examples=["Password@123"])]

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not modelService.validate_email(value):
            raise ValueError("Invalid email address.")
        return value

class GoogleLoginRequest(BaseModel):
    credential: Annotated[str,Field(min_length=1)]

# change this current to using annotated str with field validator for username validation
class UpdateNameRequest(BaseModel):
    fullname: Annotated[str, Field(min_length=2, max_length=50, examples=["John Doe"])]

class UpdateUsernameRequest(BaseModel):
    username: Annotated[
        str,
        Field(
            min_length=2,
            max_length=50,
            examples=["@user26"],
        ),
    ]

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if not value.startswith("@"):
            value = "@" + value

        if not modelService.validate_username(value):
            raise ValueError(
                "Username must start with @ and contain only "
                "letters, numbers, and underscores."
            )

        return value

# use validate password function from modelService to validate password
class SetPasswordRequest(BaseModel):
    password:  Annotated[str, Field(min_length=8, examples=["Password@123"])]
    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not modelService.validate_password(value):
            raise ValueError(
                "Password must contain at least one uppercase letter, "
                "one lowercase letter, one digit, one special character, "
                "and be at least 8 characters long."
            )
        return value

class ChangePasswordRequest(BaseModel):
    current_password: Annotated[
        str,
        Field(min_length=8),
    ]

    new_password: Annotated[
        str,
        Field(
            min_length=8,
            examples=["Password@123"],
        ),
    ]

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        if not modelService.validate_password(value):
            raise ValueError(
                "Password must contain at least one uppercase letter, "
                "one lowercase letter, one digit, one special character, "
                "and be at least 8 characters long."
            )
        return value


class VerifyOTPRequest(BaseModel):
    email: Annotated[
        str,
        Field(
            min_length=5,
            max_length=50,
            examples=["user@gmail.com"],
        ),
    ]

    otp: Annotated[
        str,
        Field(
            min_length=6,
            max_length=6,
            pattern=r"^\d{6}$",
            examples=["123456"],
        ),
    ]

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not modelService.validate_email(value):
            raise ValueError("Invalid email address.")

        return value.strip()