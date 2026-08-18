import joblib
import re
from typing import Final,TypedDict,Literal
from sklearn.base import BaseEstimator
from app.core.logger import logger
from app.core.config import settings
from xgboost import XGBRegressor

EMAIL_REGEX: Final = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
PASSWORD_REGEX: Final = re.compile(
        r"^(?=.*[a-z])"      # at least one lowercase
        r"(?=.*[A-Z])"       # at least one uppercase
        r"(?=.*\d)"          # at least one digit
        r"(?=.*[@$!%*?&^#()_+\-=\[\]{};':\"\\|,.<>/?])"  # special character
        r".{8,}$"            # minimum length 8
)
USERNAME_REGEX: Final = re.compile(r"^@[A-Za-z0-9_]{2,49}$")

class Metadata(TypedDict):
    task: str
    features: list[str]
    target: str
    metrics: dict[str, float]
    model_name : str

class Artifact(TypedDict):
    model: BaseEstimator
    metadata: Metadata

class ValidationResult(TypedDict):
    is_valid: bool
    email_error: str | None
    password_error: str | None

class ModelService:
    """
    Service responsible for loading the trained model, accessing
    artifact metadata, validating authentication credentials,
    and performing common text preprocessing.
    """

    def __init__(self):
        """
        Initialize the model service with empty artifact and model caches.
        """
        self._artifact: Artifact | None = None
        self._model: BaseEstimator | None = None

    @property
    def model(self) -> BaseEstimator:
        """
        Access the trained machine learning model.

        Returns:
            BaseEstimator: The loaded model instance.
        """
        return self.load_model()

    def load_artifact(self) -> Artifact:
        """
        Load and cache the serialized model artifact from disk.

        Returns:
            Artifact: The loaded artifact containing the trained model and metadata.

        Raises:
            Exception: If the artifact cannot be loaded.
        """
        if self._artifact is None:
            try:
                self._artifact = joblib.load(settings.ARTIFACT_PATH)
            except Exception:
                logger.exception("Failed to load artifact")
                raise

        return self._artifact

    def load_model(self)-> BaseEstimator:
        """
        Load and cache the trained machine learning model from the artifact.

        Returns:
            BaseEstimator: The loaded model instance.

        Raises:
            ValueError: If the artifact does not contain a model.
        """
        if self._model is None:
            artifact = self.load_artifact()
            if "model" not in artifact:
                error = "Artifact does not contain a model."
                logger.exception(error)
                raise ValueError(error if settings.DEBUG else settings.ERROR_MESSAGE)

            self._model = artifact["model"]

        return self._model

    def load_metadata(self) -> Metadata:
        """
        Retrieve the metadata stored in the loaded artifact.

        Returns:
            Metadata: Metadata associated with the trained model.
        """
        return self.load_artifact()["metadata"]

    def model_artifact_info(
        self,
        key: Literal[
        'features',
        'task',
        'target',
        'model_name',
        'metrics',
        ]
    )-> str | bool | dict[str, float] | dict[str, set[str]] | list[str]:
        """
        Retrieve a specific metadata value from the loaded artifact.

        Args:
            key: Metadata field to retrieve.

        Returns:
            The value associated with the requested metadata key.
        """

        return self.load_metadata()[key]

    def validate_email(self,email:str)->bool:
        """
        Validate an email address using a regular expression.

        Args:
            email: Email address to validate.

        Returns:
            bool: True if the email format is valid; otherwise False.
        """

        return bool(EMAIL_REGEX.fullmatch(email))
        
    def validate_password(self,password:str)->bool:
        """
        Validate a password against the application's security policy.

        The password must contain:
        - At least 8 characters
        - One uppercase letter
        - One lowercase letter
        - One digit
        - One special character

        Args:
            password: Password to validate.

        Returns:
            bool: True if the password satisfies all requirements; otherwise False.
        """

        return bool(PASSWORD_REGEX.fullmatch(password))
    def validate_username(self, username: str) -> bool:
        return bool(USERNAME_REGEX.fullmatch(username))
    
    def validate_auth_credentials(self,email:str,password:str)->ValidationResult:
        """
        Validate both email and password credentials.

        Args:
            email: Email address to validate.
            password: Password to validate.

        Returns:
            ValidationResult: Validation status along with any validation errors.
        """
        is_email_valid = self.validate_email(email=email)
        is_password_valid = self.validate_password(password=password)

        return {
            "is_valid": is_email_valid and is_password_valid,
            "email_error": None if is_email_valid else "Invalid email",
            "password_error": None if is_password_valid else "Invalid password"
        }

modelService = ModelService()