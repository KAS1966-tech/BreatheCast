from fastapi import APIRouter, HTTPException, status

from app.schemas.input_schemas import WeatherAQIPrediction
from app.services.predictor import predict


router = APIRouter(
    prefix="/aqi",
    tags=["AQI Prediction"],
)


@router.post(
    "/predict",
    status_code=status.HTTP_200_OK,
)
def predict_aqi(payload: WeatherAQIPrediction):
    try:
        prediction = predict(
            payload.model_dump()
        )

        return {
            "prediction": prediction,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate AQI prediction.",
        )