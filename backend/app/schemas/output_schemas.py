from pydantic import BaseModel,field_serializer
from datetime import datetime

class PredictionResponse(BaseModel):
    prediction: float

    @field_serializer("prediction")
    def round_prediction(self, value: float) -> int:
        return round(value)

class SignupResponse(BaseModel):
    id : int
    fullname:str
    username : str
    email: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

class User(BaseModel):
    id : int
    fullname:str
    username : str
    email: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

class LoginResponse(BaseModel):
    status : str
    user : User

class GoogleLoginResponse(LoginResponse):
    pass