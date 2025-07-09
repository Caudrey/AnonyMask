import logging
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from explicit_model.model import predict_explicit_pii
from implicit_model.model import predict_implicit_pii
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os
import sys
from pathlib import Path

app = FastAPI()

origins = [
    "http://localhost:4200", "http://tauri.localhost"  # The address of your Angular app
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)

BASE_DIR = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent))
os.chdir(BASE_DIR)  # Ensure working directory is correct

# Configure logging
logging.basicConfig(
    filename="anonymask_backend.log",  # This log file will appear in the working dir (see below)
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)


# Request model for prediction
class PredictionRequest(BaseModel):
    text: str

@app.middleware("http")
async def log_requests(request, call_next):
    logging.info(f"Incoming request: {request.method} | {request.headers} | {request.url} | {call_next}")
    print(f"Incoming request: {request.method} | {request.headers} | {request.url} | {call_next}")
    origin = request.headers.get("origin")
    logging.info(f"Origin: {origin}")
    print(f"Origin: {origin}")
    response = await call_next(request)
    return response

@app.post("/predictExplicit")
def predict(request: PredictionRequest):
    startDate = datetime.now()
    logging.info("Received request for /predictExplicit")

    results = predict_explicit_pii(request.text)

    endDate = datetime.now()
    elapsed = (endDate - startDate).total_seconds()
    print(f"Start Date: {startDate}")
    print(f"End Date: {endDate}")
    print(f"Duration: {elapsed:.2f} seconds")
    logging.info(f"/predictExplicit completed in {elapsed:.2f} seconds")
    return {"predictions": results}

@app.post("/predictImplicit")
def predict(request: PredictionRequest):
    startDate = datetime.now()
    logging.info("Received request for /predictImplicit")

    results = predict_implicit_pii(request.text)
    endDate = datetime.now()
    elapsed = (endDate - startDate).total_seconds()
    print(f"Start Date: {startDate}")
    print(f"End Date: {endDate}")
    print(f"Duration: {elapsed:.2f} seconds")
    logging.info(f"/predictImplicit completed in {elapsed:.2f} seconds")
    return {"predictions": results}


print("Current working dir:", os.getcwd())
print("Running:", __file__)
print("App: ", app)
print(app.routes)
print("cwd:", os.getcwd())
print("base_dir:", BASE_DIR)

print("Full path of this file:", os.path.abspath(__file__))
if __name__ == "__main__":
    logging.info("Launching FastAPI backend on 127.0.0.1:8000")
    this_file = os.path.splitext(os.path.basename(__file__))[0]
    print(f"{this_file}:app")
    print("this file: " + this_file)
    # uvicorn.run(f"{this_file}:app", host="127.0.0.1", port=8000)
    # uvicorn.run(f"{BASE_DIR}:app", host="127.0.0.1", port=8000)
    uvicorn.run(app, host="127.0.0.1", port=8000)
