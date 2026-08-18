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
    features = modelService.model_artifact_info("features")

    df = pd.DataFrame(payloads)

    missing = sorted(set(features) - set(df.columns))

    if missing:
        raise ValueError(
            f"Missing required columns: {', '.join(missing)}"
        )

    # Keep the same feature order used during training
    df = df[features]

    model = modelService.model

    predictions = model.predict(df)

    return predictions.tolist()