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
    IMPLICIT_MODEL_PATH = str(BASE_DIR / "implicit_model")
    MLB_PATH = IMPLICIT_MODEL_PATH / "mlb.pkl"
else:
    # In dev mode, the script is already inside explicit_model/
    IMPLICIT_MODEL_PATH = str(BASE_DIR)

CONFIDENCE_THRESHOLD = 0.5 # Only show predictions with a score > 0.5

# This list must be loaded from your training script or be identical to mlb.classes_
# to ensure the mapping from prediction index to label name is correct.
# IMPLICIT_LABELS = [
#     '-', 'Address', 'Asset', 'Balance', 'Body_Height', 'Body_Weight',
#     'Criminal_Hist', 'DOB', 'Edu_Hist', 'Location', 'Marr_Status',
#     'Med_Hist', 'Name', 'Occ_Hist', 'POB', 'Parent_Name', 'Plate',
#     'Religion', 'Salary', 'Username'
# ]
# --- 2. MODEL LOADING ---

print("Loading implicit classification model...")
print("Full path of this file:", os.path.abspath(__file__))
# device = "cuda" if torch.cuda.is_available() else "cpu"

def load_implicit_tools(model_path, mlb_path):
    """Loads the fine-tuned model, tokenizer, and MultiLabelBinarizer."""
    print("--- Loading Implicit Model and Tools ---")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    try:
        if not model_path.exists() or not mlb_path.exists():
            raise FileNotFoundError("Model or mlb.pkl not found in the specified path.")

        model = AutoModelForSequenceClassification.from_pretrained(model_path)
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        mlb = joblib.load(mlb_path)

        model.to(device)
        model.eval()

        print("Model, Tokenizer, and MultiLabelBinarizer loaded successfully.")
        print(f"Detected Labels: {list(mlb.classes_)}")
        return model, tokenizer, mlb, device

    except Exception as e:
        print(f"--- ERROR LOADING MODEL ---")
        print(f"Error: {e}")
        print(f"Please ensure the path '{model_path}' and '{mlb_path}' are correct.")
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

# try:
#     implicit_model = SetFitModel.from_pretrained(IMPLICIT_MODEL_PATH).to(device)
#     # Create a mapping from the model's output index to the correct label name
#     implicit_inv_label_mapping = {i: label for i, label in enumerate(IMPLICIT_LABELS)}
#     print("Implicit classification model loaded successfully.")
# except Exception as e:
#     print(f"Error loading implicit model: {e}")
#     implicit_model = None



# --- 3. IMPLICIT PREDICTION LOGIC ---

# def predict_implicit_pii(text: str):
#     """
#     Detects implicit PII topics by analyzing each individual sentence.
#     """
#     if not implicit_model:
#         print("Model or NLP tools not loaded. Cannot run prediction.")
#         return []

#     # This regex splits on sentence-ending punctuation or newlines.
#     SENTENCE_SPLIT_REGEX = r'(?<!\b(Jl|No|Bpk|Ibu|Dr|Prof|Tn|Ny|H|dll|dsb|Yth))\.\s+|(?<=[?!])\s+|\s*[\r\n]+\s*'

#     # Use re.finditer to get the start and end positions of sentence separators
#     separators = list(re.finditer(SENTENCE_SPLIT_REGEX, text))

#     sentences_with_spans = []
#     last_end = 0

#     for match in separators:
#         start_pos, end_pos = match.span()
#         # Find the true start of the sentence text, accounting for leading whitespace
#         true_start = len(text) - len(text[last_end:].lstrip())
#         sentence_text = text[true_start:start_pos].strip()
#         if sentence_text:
#             sentences_with_spans.append({"text": sentence_text, "start": true_start, "end": start_pos})
#         last_end = end_pos

#     # Add the last sentence after the final separator
#     last_sentence = text[last_end:].strip()
#     if last_sentence:
#         true_start = len(text) - len(text[last_end:].lstrip())
#         sentences_with_spans.append({"text": last_sentence, "start": true_start, "end": len(text)})

#     if not sentences_with_spans:
#         return []

#     sentence_texts = [s['text'] for s in sentences_with_spans]

#     # Get binary predictions directly from the model
#     binary_predictions_tensor = implicit_model(sentence_texts)
#     binary_labels = binary_predictions_tensor.cpu().numpy()

#     # Format the results, including the start and end positions
#     results = []
#     for i, sentence_info in enumerate(sentences_with_spans):
#         topics_for_sentence = []
#         for idx, val in enumerate(binary_labels[i]):
#             if val == 1:
#                 topic = implicit_inv_label_mapping.get(idx)
#                 if topic and topic != '-':
#                     topics_for_sentence.append(topic)

#         if topics_for_sentence:
#             results.append({
#                 "sentence": sentence_info['text'],
#                 "predicted_topics": sorted(topics_for_sentence),
#                 "start": sentence_info['start'],
#                 "end": sentence_info['end']
#             })

#     return results

test_text = """
Vincent lahir di depan rumah sakit depan mall bca foresta indah
"""
print(f"Analyzing Text:\n---\n{test_text}\n---\n")

final_result = predict_implicit_pii(test_text)

print("Final Aggregated Implicit Topics Detected:")
print(final_result)


# import torch
# from transformers import AutoTokenizer, AutoModelForTokenClassification
# from setfit import SetFitModel
# import regex as re

# IMPLICIT_MODEL_PATH = "./implicit_model"  # <-- IMPORTANT: Update with the correct path to your SetFit model
# DEFAULT_IMPLICIT_THRESHOLD = 0.7  # Default confidence threshold
# WINDOW_SIZE = 3 # Must match the window size used during training

# # IMPORTANT: This list must match the exact order from your model training.
# IMPLICIT_LABELS = [
#     '-',
#     'Address',
#     'Asset',
#     'Balance',
#     'Body_Height',
#     'Body_Weight',
#     'Criminal_Hist',
#     'DOB',
#     'Edu_Hist',
#     'Location',
#     'Marr_Status',
#     'Med_Hist',
#     'Name',
#     'Occ_Hist',
#     'POB',
#     'Parent_Name',
#     'Plate',
#     'Religion',
#     'Salary',
#     'Username'
# ]

# # =====================================================================================
# # 2. MODEL LOADING
# # =====================================================================================
# print("Loading implicit classification model...")
# device = "cuda" if torch.cuda.is_available() else "cpu"
# try:
#     implicit_model = SetFitModel.from_pretrained(IMPLICIT_MODEL_PATH).to(device)
#     # Create a mapping from index to label name for implicit predictions
#     implicit_inv_label_mapping = {i: label for i, label in enumerate(IMPLICIT_LABELS)}
#     print("Implicit classification model loaded successfully.")
# except Exception as e:
#     print(f"Error loading implicit model: {e}")
#     implicit_model = None # Set to None if loading fails

# # =====================================================================================
# # 3. IMPLICIT PREDICTION LOGIC
# # =====================================================================================

# # def predict_implicit_pii(text: str, threshold: float = DEFAULT_IMPLICIT_THRESHOLD):
# #     """
# #     Detects implicit PII topics by analyzing each individual sentence.
# #     """
# #     if not implicit_model:
# #         print("Implicit model not loaded. Cannot run prediction.")
# #         return []

# #     # --- UPDATED SENTENCE SPLITTING LOGIC ---
# #     # This regex now splits on sentence-ending punctuation (., ?, !) OR on newlines.
# #     # It still correctly ignores periods used in common abbreviations.
# #     SENTENCE_SPLIT_REGEX = r'(?<!\b(Jl|No|Bpk|Ibu|Dr|Prof|Tn|Ny|H|dll|dsb|Yth))\.\s+|(?<=[?!])\s+|\s*[\r\n]+\s*'
# #     sentences = [s.strip() for s in re.split(SENTENCE_SPLIT_REGEX, text) if s and s.strip()]

# #     if not sentences:
# #         return []

# #     # --- Predict on the sentences ---
# #     predictions = implicit_model.predict_proba(sentences)
# #     binary_labels = (predictions.cpu().numpy() > threshold).astype(int)

# #     # --- Format the results to show sentence and its specific output ---
# #     results = []
# #     for i, sentence in enumerate(sentences):
# #         # Get the labels for the current sentence
# #         topics_for_sentence = []
# #         for idx, val in enumerate(binary_labels[i]):
# #             if val == 1:
# #                 topic = implicit_inv_label_mapping.get(idx)
# #                 if topic and topic != '-':
# #                     topics_for_sentence.append(topic)

# #         # Only include sentences that have at least one predicted topic
# #         if topics_for_sentence:
# #             results.append({
# #                 "sentence": sentence,
# #                 "predicted_topics": sorted(topics_for_sentence)
# #             })

# #     return results

# def predict_implicit_pii(text: str):
#     """
#     Detects implicit PII topics by analyzing each individual sentence
#     using the model's direct prediction output.
#     """
#     if not implicit_model:
#         print("Implicit model not loaded. Cannot run prediction.")
#         return []

#     # This regex now works correctly with the `regex` library because it supports
#     # variable-width lookbehinds (e.g., matching "Jl" or "Bpk").
#     SENTENCE_SPLIT_REGEX = r'(?<!\b(Jl|No|Bpk|Ibu|Dr|Prof|Tn|Ny|H|dll|dsb|Yth))\.\s+|(?<=[?!])\s+|\s*[\r\n]+\s*'
#     sentences = [s.strip() for s in re.split(SENTENCE_SPLIT_REGEX, text) if s and s.strip()]

#     if not sentences:
#         return []

#     # --- UPDATED: Use the direct model call, not predict_proba ---
#     binary_predictions_tensor = implicit_model(sentences)
#     binary_labels = binary_predictions_tensor.cpu().numpy()

#     # --- Format the results to show sentence and its specific output ---
#     results = []
#     for i, sentence in enumerate(sentences):
#         # Get the labels for the current sentence
#         topics_for_sentence = []
#         for idx, val in enumerate(binary_labels[i]):
#             if val == 1:
#                 topic = implicit_inv_label_mapping.get(idx)
#                 if topic and topic != '-':
#                     topics_for_sentence.append(topic)

#         # Only include sentences that have at least one predicted topic
#         if topics_for_sentence:
#             results.append({
#                 "sentence": sentence,
#                 "predicted_topics": sorted(topics_for_sentence)
#             })

#     return results
