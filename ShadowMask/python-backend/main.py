from fastapi import FastAPI
from pydantic import BaseModel
from masker import mask_text
from explicit_model.model import predict_explicit_pii
from implicit_model.model import predict_implicit_pii
from mask_config import set_mask_words, set_excluded_words
from fastapi.middleware.cors import CORSMiddleware

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

@app.post("/predict")
def predict(request: PredictionRequest):
    resultsExplicit = predict_explicit_pii(request.text)
    resultsImplicit = predict_implicit_pii(request.text)
    print("Hai")
    return {"predictionsExplicit": resultsExplicit, "predictionsImplicit": resultsImplicit}

@app.post("/mask")
def run_masking(request: PredictionRequest):
    masked = mask_text(request.text)
    return {"masked": masked}

@app.post("/config/add-words")
def add_words(words: list[str]):
    set_mask_words(words)
    return {"status": "added", "words": words}

@app.post("/config/exclude-words")
def exclude_words(words: list[str]):
    set_excluded_words(words)
    return {"status": "excluded", "words": words}
