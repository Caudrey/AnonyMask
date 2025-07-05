from fastapi import FastAPI
from pydantic import BaseModel
from explicit_model.model import predict_explicit_pii
from implicit_model.model import predict_implicit_pii
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI()

origins = [
    "http://localhost:4200",  # The address of your Angular app
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)

# Request model for prediction
class PredictionRequest(BaseModel):
    text: str

@app.post("/predictExplicit")
def predict(request: PredictionRequest):
    startDate = datetime.now()

    results = predict_explicit_pii(request.text)

    endDate = datetime.now()
    elapsed = (endDate - startDate).total_seconds()
    print(f"Start Date: {startDate}")
    print(f"End Date: {endDate}")
    print(f"Duration: {elapsed:.2f} seconds")
    return {"predictions": results}

@app.post("/predictImplicit")
def predict(request: PredictionRequest):
    startDate = datetime.now()

    results = predict_implicit_pii(request.text)

    endDate = datetime.now()
    elapsed = (endDate - startDate).total_seconds()
    print(f"Start Date: {startDate}")
    print(f"End Date: {endDate}")
    print(f"Duration: {elapsed:.2f} seconds")
    return {"predictions": results}
