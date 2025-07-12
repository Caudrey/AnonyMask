import logging
import torch
import numpy as np
import joblib
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import regex as re
import json
import sys
import os
from pathlib import Path

# --- 1. CONFIGURATION ---

# IMPORTANT: Update this path to point to your saved SetFit model folder
# e.g., "/kaggle/working/multilingual_implicit_sentence_model_20250705_123456"

# For PyInstaller compatibility
BASE_DIR = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent))

# If running from PyInstaller, add subfolder
if hasattr(sys, '_MEIPASS'):
    IMPLICIT_MODEL_PATH =  os.path.join(BASE_DIR, "implicit_model")
    MLB_PATH = os.path.join(BASE_DIR, "implicit_model", "mlb.pkl")
else:
    # In dev mode, the script is already inside explicit_model/
    IMPLICIT_MODEL_PATH = "WhiteCloudd/AnonymaskImplicit"
    MLB_PATH = os.path.join(BASE_DIR, "mlb.pkl")


logging.basicConfig(
    filename="anonymask_backend.log",  # This log file will appear in the working dir (see below)
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
print("Implicit model path: " + IMPLICIT_MODEL_PATH)
print("MLB PATH: " + str(MLB_PATH))
logging.info("Implicit model path: " + IMPLICIT_MODEL_PATH)
logging.info("MLB PATH: " + str(MLB_PATH))

# MLB_PATH = IMPLICIT_MODEL_PATH / "mlb.pkl"

CONFIDENCE_THRESHOLD = 0.5 # Only show predictions with a score > 0.5
# IMPLICIT_MODEL_PATH = "WhiteCloudd/AnonymaskImplicit"
# MLB_PATH = IMPLICIT_MODEL_LOCAL_PATH + "/mlb.pkl"

# This list must be loaded from your training script or be identical to mlb.classes_
# to ensure the mapping from prediction index to label name is correct.
# IMPLICIT_LABELS = [
#     '-', 'Address', 'Asset', 'Balance', 'Body_Height', 'Body_Weight',
#     'Criminal_Hist', 'DOB', 'Edu_Hist', 'Location', 'Marr_Status',
#     'Med_Hist', 'Name', 'Occ_Hist', 'POB', 'Parent_Name', 'Plate',
#     'Religion', 'Salary', 'Username'
# ]
# --- 2. MODEL LOADING --

print("Loading implicit classification model...")
print("Full path of this file:", os.path.abspath(__file__))
# device = "cuda" if torch.cuda.is_available() else "cpu"

def load_implicit_tools(model_path, mlb_path):
    """Loads the fine-tuned model, tokenizer, and MultiLabelBinarizer."""
    print("--- Loading Implicit Model and Tools ---")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    try:
        # if not model_path.exists() or not mlb_path.exists():
        #     raise FileNotFoundError("Model or mlb.pkl not found in the specified path.")

        model = AutoModelForSequenceClassification.from_pretrained(model_path)
        logging.info("1")
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        logging.info("2")
        mlb = joblib.load(mlb_path)
        logging.info("3")

        # model.save_pretrained("models/AnonymaskImplicit")
        # tokenizer.save_pretrained("models/AnonymaskImplicit")

        model.to(device)
        model.eval()

        logging.info("Model, Tokenizer, and MultiLabelBinarizer loaded successfully.")
        logging.info(f"Detected Labels: {list(mlb.classes_)}")
        print(f"Detected Labels: {list(mlb.classes_)}")
        logging.info(f"Detected Labels: {list(mlb.classes_)}")
        return model, tokenizer, mlb, device

    except Exception as e:
        print(f"--- ERROR LOADING MODEL ---")
        print(f"Error: {e}")
        print(f"Please ensure the path '{model_path}' and '{mlb_path}' are correct.")
        logging.info(f"--- ERROR LOADING MODEL ---")
        logging.info(f"Error: {e}")
        logging.info(f"Please ensure the path '{model_path}' and '{mlb_path}' are correct.")
        return None, None, None, None

# Load all necessary components at the start
implicit_model, implicit_tokenizer, mlb, device = load_implicit_tools(IMPLICIT_MODEL_PATH, MLB_PATH)

# --- 3. IMPLICIT PREDICTION LOGIC ---

def predict_single_sentence(text: str, model, tokenizer, binarizer, threshold=0.5):
    """
    Runs a prediction on a single sentence and returns a list of detected topics.
    """
    if not all([model, tokenizer, binarizer]):
        return []

    # 1. Tokenize the input text
    inputs = tokenizer(text, padding=True, truncation=True, max_length=512, return_tensors="pt").to(device)

    # 2. Get predictions from the model
    with torch.no_grad():
        outputs = model(**inputs)

    # 3. Convert logits to probabilities
    logits = outputs.logits
    probabilities = torch.sigmoid(logits).cpu().numpy()[0]

    # 4. Map probabilities to labels and apply threshold
    detected_topics = []
    for i, prob in enumerate(probabilities):
        if prob > threshold:
            label_name = binarizer.classes_[i]
            if label_name.startswith("B_") or label_name.startswith("I_"):
                # Slice the string to remove the first 2 characters (e.g., "B_")
                base_label = label_name[2:]
            else:
                # Otherwise, use the label name as is
                base_label = label_name
            # -----------------------------

            if base_label and base_label != '-':
                detected_topics.append({"topic": base_label, "score": float(prob)})

    # Sort by score for cleaner output
    return sorted(detected_topics, key=lambda x: x['score'], reverse=True)

def predict_implicit_pii(text: str):
    """
    Splits text into sentences, runs prediction on each, and returns aggregated results.
    """
    if not implicit_model:
        return "Model not loaded. Cannot run prediction."

    SENTENCE_SPLIT_REGEX = r'(?<!\b(Jl|No|Bpk|Ibu|Dr|Prof|H))\.\s+|(?<=[?!])\s+|\s*[\r\n]+\s*'
    sentences = re.split(SENTENCE_SPLIT_REGEX, text)
    sentences = [s.strip() for s in sentences if s and s.strip()]

    if not sentences:
        return []

    results = []
    current_pos = 0
    for sentence_text in sentences:
        start_char = text.find(sentence_text, current_pos)
        end_char = start_char + len(sentence_text)
        current_pos = end_char

        predicted_topics = predict_single_sentence(
            sentence_text, implicit_model, implicit_tokenizer, mlb, threshold=CONFIDENCE_THRESHOLD
        )

        if predicted_topics:
            results.append({
                "sentence": sentence_text,
                "predicted_topics": predicted_topics,
                "start": start_char,
                "end": end_char
            })
    return results
