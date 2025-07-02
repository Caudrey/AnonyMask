import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification
from setfit import SetFitModel
import regex as re

IMPLICIT_MODEL_PATH = "./implicit_model"  # <-- IMPORTANT: Update with the correct path to your SetFit model
DEFAULT_IMPLICIT_THRESHOLD = 0.7  # Default confidence threshold
WINDOW_SIZE = 3 # Must match the window size used during training

# IMPORTANT: This list must match the exact order from your model training.
IMPLICIT_LABELS = [
    '-',
    'Address',
    'Asset',
    'Balance',
    'Body_Height',
    'Body_Weight',
    'Criminal_Hist',
    'DOB',
    'Edu_Hist',
    'Location',
    'Marr_Status',
    'Med_Hist',
    'Name',
    'Occ_Hist',
    'POB',
    'Parent_Name',
    'Plate',
    'Religion',
    'Salary',
    'Username'
]

# =====================================================================================
# 2. MODEL LOADING
# =====================================================================================
print("Loading implicit classification model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
try:
    implicit_model = SetFitModel.from_pretrained(IMPLICIT_MODEL_PATH).to(device)
    # Create a mapping from index to label name for implicit predictions
    implicit_inv_label_mapping = {i: label for i, label in enumerate(IMPLICIT_LABELS)}
    print("Implicit classification model loaded successfully.")
except Exception as e:
    print(f"Error loading implicit model: {e}")
    implicit_model = None # Set to None if loading fails

# =====================================================================================
# 3. IMPLICIT PREDICTION LOGIC
# =====================================================================================

# def predict_implicit_pii(text: str, threshold: float = DEFAULT_IMPLICIT_THRESHOLD):
#     """
#     Detects implicit PII topics by analyzing each individual sentence.
#     """
#     if not implicit_model:
#         print("Implicit model not loaded. Cannot run prediction.")
#         return []

#     # --- UPDATED SENTENCE SPLITTING LOGIC ---
#     # This regex now splits on sentence-ending punctuation (., ?, !) OR on newlines.
#     # It still correctly ignores periods used in common abbreviations.
#     SENTENCE_SPLIT_REGEX = r'(?<!\b(Jl|No|Bpk|Ibu|Dr|Prof|Tn|Ny|H|dll|dsb|Yth))\.\s+|(?<=[?!])\s+|\s*[\r\n]+\s*'
#     sentences = [s.strip() for s in re.split(SENTENCE_SPLIT_REGEX, text) if s and s.strip()]

#     if not sentences:
#         return []

#     # --- Predict on the sentences ---
#     predictions = implicit_model.predict_proba(sentences)
#     binary_labels = (predictions.cpu().numpy() > threshold).astype(int)

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

def predict_implicit_pii(text: str):
    """
    Detects implicit PII topics by analyzing each individual sentence
    using the model's direct prediction output.
    """
    if not implicit_model:
        print("Implicit model not loaded. Cannot run prediction.")
        return []

    # This regex now works correctly with the `regex` library because it supports
    # variable-width lookbehinds (e.g., matching "Jl" or "Bpk").
    SENTENCE_SPLIT_REGEX = r'(?<!\b(Jl|No|Bpk|Ibu|Dr|Prof|Tn|Ny|H|dll|dsb|Yth))\.\s+|(?<=[?!])\s+|\s*[\r\n]+\s*'
    sentences = [s.strip() for s in re.split(SENTENCE_SPLIT_REGEX, text) if s and s.strip()]

    if not sentences:
        return []

    # --- UPDATED: Use the direct model call, not predict_proba ---
    binary_predictions_tensor = implicit_model(sentences)
    binary_labels = binary_predictions_tensor.cpu().numpy()

    # --- Format the results to show sentence and its specific output ---
    results = []
    for i, sentence in enumerate(sentences):
        # Get the labels for the current sentence
        topics_for_sentence = []
        for idx, val in enumerate(binary_labels[i]):
            if val == 1:
                topic = implicit_inv_label_mapping.get(idx)
                if topic and topic != '-':
                    topics_for_sentence.append(topic)

        # Only include sentences that have at least one predicted topic
        if topics_for_sentence:
            results.append({
                "sentence": sentence,
                "predicted_topics": sorted(topics_for_sentence)
            })

    return results
