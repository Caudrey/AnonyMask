# import torch
# from transformers import AutoTokenizer, AutoModelForTokenClassification
# from setfit import SetFitModel
# import regex as re

# # --- 1. CONFIGURATION ---

# # IMPORTANT: Update with the correct path to your saved SetFit model
# IMPLICIT_MODEL_PATH = "./implicit_model" # <-- Example path, use your actual folder name
# WINDOW_SIZE = 3 # This MUST match the window size used during training

# # This list must match the exact order of classes from your MultiLabelBinarizer during training.
# # You might need to save and load `mlb.classes_` from your training script to ensure this is correct.
# IMPLICIT_LABELS = [
#     '-', 'Address', 'Asset', 'Balance', 'Body_Height', 'Body_Weight',
#     'Criminal_Hist', 'DOB', 'Edu_Hist', 'Location', 'Marr_Status',
#     'Med_Hist', 'Name', 'Occ_Hist', 'POB', 'Parent_Name', 'Plate',
#     'Religion', 'Salary', 'Username'
# ]

# # --- 2. MODEL LOADING ---

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

# # --- 3. IMPLICIT PREDICTION LOGIC (ADJUSTED FOR SLIDING WINDOW) ---

# def predict_implicit_pii(text: str):
#     """
#     Detects implicit PII topics by analyzing the text in sliding window chunks,
#     matching the training methodology.
#     """
#     if not implicit_model:
#         print("Implicit model not loaded. Cannot run prediction.")
#         return []

#     # Step 1: Split the entire text into individual sentences or messages.
#     # This regex splits on sentence-ending punctuation or newlines.
#     SENTENCE_SPLIT_REGEX = r'(?<!\b(Jl|No|Bpk|Ibu|Dr|Prof|Tn|Ny|H|dll|dsb|Yth))\.\s+|(?<=[?!])\s+|\s*[\r\n]+\s*'
#     sentences = [s.strip() for s in re.split(SENTENCE_SPLIT_REGEX, text) if s and s.strip()]

#     if not sentences:
#         return []

#     # Step 2: Create overlapping chunks of sentences, just like in training.
#     chunks = []
#     if len(sentences) >= WINDOW_SIZE:
#         for i in range(len(sentences) - WINDOW_SIZE + 1):
#             chunk = " ".join(sentences[i : i + WINDOW_SIZE])
#             chunks.append(chunk)
#     elif len(sentences) > 0:
#         # If there are fewer sentences than the window size, analyze them all together.
#         chunks.append(" ".join(sentences))

#     if not chunks:
#         return []

#     # Step 3: Get predictions from the model for all chunks.
#     # The model directly outputs binary predictions [0, 1, 0, ...].
#     binary_predictions_tensor = implicit_model(chunks)
#     binary_labels = binary_predictions_tensor.cpu().numpy()

#     # Step 4: Aggregate all unique topics found across all chunks.
#     all_detected_topics = set()
#     for i, chunk in enumerate(chunks):
#         for idx, val in enumerate(binary_labels[i]):
#             if val == 1:
#                 topic = implicit_inv_label_mapping.get(idx)
#                 if topic and topic != '-':
#                     all_detected_topics.add(topic)

#     # Step 5: Format the final output.
#     # We return a single list of all unique topics found in the entire text.
#     if not all_detected_topics:
#         return []

#     return {
#         "detected_implicit_topics": sorted(list(all_detected_topics))
#     }

import torch
from setfit import SetFitModel
import regex as re
import json

# --- 1. CONFIGURATION ---

# IMPORTANT: Update this path to point to your saved SetFit model folder
# e.g., "/kaggle/working/multilingual_implicit_sentence_model_20250705_123456"
IMPLICIT_MODEL_PATH = "./implicit_model"

# This list must be loaded from your training script or be identical to mlb.classes_
# to ensure the mapping from prediction index to label name is correct.
IMPLICIT_LABELS = [
    '-', 'Address', 'Asset', 'Balance', 'Body_Height', 'Body_Weight',
    'Criminal_Hist', 'DOB', 'Edu_Hist', 'Location', 'Marr_Status',
    'Med_Hist', 'Name', 'Occ_Hist', 'POB', 'Parent_Name', 'Plate',
    'Religion', 'Salary', 'Username'
]
# --- 2. MODEL LOADING ---

print("Loading implicit classification model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
try:
    implicit_model = SetFitModel.from_pretrained(IMPLICIT_MODEL_PATH).to(device)
    # Create a mapping from the model's output index to the correct label name
    implicit_inv_label_mapping = {i: label for i, label in enumerate(IMPLICIT_LABELS)}
    print("Implicit classification model loaded successfully.")
except Exception as e:
    print(f"Error loading implicit model: {e}")
    implicit_model = None

# --- 3. IMPLICIT PREDICTION LOGIC ---

def predict_implicit_pii(text: str):
    """
    Detects implicit PII topics by analyzing each individual sentence.
    """
    if not implicit_model:
        print("Model or NLP tools not loaded. Cannot run prediction.")
        return []

    # This regex splits on sentence-ending punctuation or newlines.
    SENTENCE_SPLIT_REGEX = r'(?<!\b(Jl|No|Bpk|Ibu|Dr|Prof|Tn|Ny|H|dll|dsb|Yth))\.\s+|(?<=[?!])\s+|\s*[\r\n]+\s*'

    # Use re.finditer to get the start and end positions of sentence separators
    separators = list(re.finditer(SENTENCE_SPLIT_REGEX, text))

    sentences_with_spans = []
    last_end = 0

    for match in separators:
        start_pos, end_pos = match.span()
        # Find the true start of the sentence text, accounting for leading whitespace
        true_start = len(text) - len(text[last_end:].lstrip())
        sentence_text = text[true_start:start_pos].strip()
        if sentence_text:
            sentences_with_spans.append({"text": sentence_text, "start": true_start, "end": start_pos})
        last_end = end_pos

    # Add the last sentence after the final separator
    last_sentence = text[last_end:].strip()
    if last_sentence:
        true_start = len(text) - len(text[last_end:].lstrip())
        sentences_with_spans.append({"text": last_sentence, "start": true_start, "end": len(text)})

    if not sentences_with_spans:
        return []

    sentence_texts = [s['text'] for s in sentences_with_spans]

    # Get binary predictions directly from the model
    binary_predictions_tensor = implicit_model(sentence_texts)
    binary_labels = binary_predictions_tensor.cpu().numpy()

    # Format the results, including the start and end positions
    results = []
    for i, sentence_info in enumerate(sentences_with_spans):
        topics_for_sentence = []
        for idx, val in enumerate(binary_labels[i]):
            if val == 1:
                topic = implicit_inv_label_mapping.get(idx)
                if topic and topic != '-':
                    topics_for_sentence.append(topic)

        if topics_for_sentence:
            results.append({
                "sentence": sentence_info['text'],
                "predicted_topics": sorted(topics_for_sentence),
                "start": sentence_info['start'],
                "end": sentence_info['end']
            })
    
    return results

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
