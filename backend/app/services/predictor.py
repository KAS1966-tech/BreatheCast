import pandas as pd

from app.core.artifact import modelService


def predict(payload: dict):
    features = modelService.model_artifact_info("features")

    df = pd.DataFrame([payload])

    missing = sorted(set(features) - set(df.columns))

    if missing:
        raise ValueError(
            f"Missing required columns: {', '.join(missing)}"
        )

    # Keep only the features used during training
    df = df[features]

    model = modelService.model

    prediction = model.predict(df)

    return float(prediction[0])


def predict_batch(payloads: list[dict]):
    if not payloads:
        return []

    features = modelService.model_artifact_info("features")

    # Since payloads come from Pydantic model_dump(), keys are consistent.
    missing = sorted(set(features) - payloads[0].keys())

    if missing:
        raise ValueError(
            f"Missing required columns: {', '.join(missing)}"
        )

    # Create DataFrame directly with correct feature order
    df = pd.DataFrame(payloads, columns=features)

    model = modelService.model
    predictions = model.predict(df)

    return predictions.tolist()