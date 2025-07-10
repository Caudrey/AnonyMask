import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
import re
import os
from datetime import datetime

# --- MODEL AND TOKENIZER SETUP ---
# In a real app, this would be done once on startup.

# Use a generic path. Replace this with the actual path to your saved model folder
# For this example, we'll assume it's in the current directory.
import sys
from pathlib import Path

# # For PyInstaller compatibility
# BASE_DIR = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent))

# # If running from PyInstaller, add subfolder
# if hasattr(sys, '_MEIPASS'):
#     MODEL_PATH = str(BASE_DIR / "explicit_model")
# else:
#     # In dev mode, the script is already inside explicit_model/
#     MODEL_PATH = str(BASE_DIR)

MODEL_PATH = "WhiteCloudd/AnonymaskExplicit"
MAX_LENGTH = 128  # The maximum sequence length for the model
OVERLAP = 30      # The number of tokens to overlap between chunks

print("Loading EXPLICIT classification model...")
print("Full path of this file:", os.path.abspath(__file__))
device = "cuda" if torch.cuda.is_available() else "cpu"
try:
    # Load the fine-tuned model and tokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH).to(device)
    model.eval()

    # Load labels dynamically from the model's config for robustness
    index_to_label = model.config.id2label
    print("Model loaded successfully.")

except Exception as e:
    print(f"Error loading model: {e}")
    print(f"Please make sure the path '{MODEL_PATH}' points to your saved model directory.")
    model = None


def predict_explicit_pii(text: str):
    """
    Predicts PII entities in a given text using a sliding window approach
    and a robust entity grouping logic that correctly handles punctuation.
    """
    if not model:
        print("Model not loaded. Cannot run prediction.")
        return []

    # --- Step 1: Tokenize and Predict on Chunks ---

    tokens = tokenizer(
        text,
        return_offsets_mapping=True,
        truncation=True,
        max_length=MAX_LENGTH,
        stride=OVERLAP,
        return_overflowing_tokens=True
    )

    all_token_predictions = []

    for i in range(len(tokens["input_ids"])):
        chunk_input_ids = torch.tensor([tokens["input_ids"][i]], device=device)
        chunk_offset_mapping = tokens["offset_mapping"][i]

        with torch.no_grad():
            outputs = model(chunk_input_ids).logits
            predictions = torch.argmax(outputs, dim=2)

        for j, pred_idx in enumerate(predictions[0]):
            label = index_to_label[pred_idx.item()]
            offset = chunk_offset_mapping[j]

            if offset is None or (offset[0] == 0 and offset[1] == 0):
                continue

            all_token_predictions.append({"label": label, "start": offset[0], "end": offset[1]})

    unique_predictions_by_start = {pred['start']: pred for pred in all_token_predictions}
    sorted_predictions = sorted(unique_predictions_by_start.values(), key=lambda x: x['start'])

    # **DEBUGGING:** Print the raw token predictions before grouping
    print("\n--- Raw Token Predictions (Before Grouping) ---")
    for pred in sorted_predictions:
        if pred['label'] != 'O': # Only print non-O tags to see what the model found
             print(f"Token: '{text[pred['start']:pred['end']]}', Label: {pred['label']}")
    print("---------------------------------------------\n")


    # --- Step 2: **IMPROVED** Entity Grouping Logic ---
    final_entities = []
    i = 0
    while i < len(sorted_predictions):
        pred = sorted_predictions[i]
        label = pred['label']

        if label == 'O':
            i += 1
            continue

        # Get the base entity type (e.g., 'Name' from 'B-Name' or 'I-Name')
        base_entity_type = label[2:]
        start_offset = pred['start']
        end_offset = pred['end']

        # Look ahead to merge adjacent or nearby tokens of the same entity type
        k = i + 1
        while k < len(sorted_predictions):
            next_pred = sorted_predictions[k]
            next_label = next_pred['label']

            # Allow 'O' labels for spaces or punctuation between entity parts
            if next_label == 'O':
                gap_text = text[end_offset:next_pred['start']]
                if gap_text.isspace() or gap_text == '':
                    # If the token after the gap is part of the same entity, merge it
                    if k + 1 < len(sorted_predictions):
                        potential_next_part = sorted_predictions[k+1]
                        if potential_next_part['label'][2:] == base_entity_type:
                            end_offset = potential_next_part['end']
                            k += 2 # Skip the 'O' token and the merged part
                            continue
                # If it's not a mergeable gap, stop.
                break

            next_base_entity_type = next_label[2:]

            # Condition to merge: must have the same base type and be adjacent or separated by only a space
            gap_text = text[end_offset:next_pred['start']]
            if next_base_entity_type == base_entity_type and (next_pred['start'] == end_offset or gap_text.isspace()):
                end_offset = next_pred['end']
                k += 1
            else:
                break # Stop if there's a significant gap or the entity type changes

        final_entities.append({
            "word": text[start_offset:end_offset],
            "label": base_entity_type,
            "start": start_offset,
            "end": end_offset
        })

        # Move the main index past all the tokens we just processed
        i = k

    return final_entities

def mask_text_with_spans(original_text, pii_results):
    """
    Masks PII entities in a text using their start and end character positions.
    """
    pii_results.sort(key=lambda x: x['start'])

    masked_text = ""
    last_index = 0

    for entity in pii_results:
        masked_text += original_text[last_index:entity['start']]
        masked_text += f"[{entity['label'].upper()}]"
        last_index = entity['end']

    masked_text += original_text[last_index:]
    return masked_text

# import torch
# from transformers import AutoTokenizer, AutoModelForTokenClassification

# MODEL_PATH = "./explicit_model"
# MAX_LENGTH = 128 # The maximum sequence length for the model
# OVERLAP = 30 # The number of tokens to overlap between chunks

# device = "cuda" if torch.cuda.is_available() else "cpu"
# try:
#     # The Auto... classes will automatically detect the XLM-RoBERTa architecture
#     tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
#     model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH).to(device)
#     model.eval()

#     # --- CRITICAL CHANGE: Load labels dynamically from the model's config ---
#     # This is much more robust than a hardcoded dictionary.
#     index_to_label = model.config.id2label
#     print("Model loaded successfully.")

# except Exception as e:
#     print(f"Error loading model: {e}")
#     model = None # Set to None if loading fails


# def predict_explicit_pii(text: str):
#     """
#     Final robust version for entity grouping. This function is now cleaned up
#     for production use (debug prints removed).
#     """
#     if not model:
#         print("Model not loaded. Cannot run prediction.")
#         return []

#     # Tokenize the input text
#     tokens = tokenizer(text, return_offsets_mapping=True, truncation=False)
#     input_ids = tokens['input_ids']
#     offset_mapping = tokens['offset_mapping']
#     total_length = len(input_ids)

#     all_token_predictions = []

#     # Process the text in chunks
#     for i in range(0, total_length, MAX_LENGTH - OVERLAP):
#         chunk_start = i
#         chunk_end = min(i + MAX_LENGTH, total_length)

#         chunk_input_ids = torch.tensor([input_ids[chunk_start:chunk_end]], device=device)

#         with torch.no_grad():
#             outputs = model(chunk_input_ids).logits
#             predictions = torch.argmax(outputs, dim=2)

#         for j, pred_idx in enumerate(predictions[0]):
#             label = index_to_label[pred_idx.item()]
#             offset = offset_mapping[chunk_start + j]
#             if offset[0] == offset[1]: continue
#             all_token_predictions.append({"label": label, "start": offset[0], "end": offset[1]})

#     # De-duplicate and sort predictions
#     unique_predictions_by_start = {pred['start']: pred for pred in all_token_predictions}
#     sorted_predictions = sorted(unique_predictions_by_start.values(), key=lambda x: x['start'])

#     # --- Robust Entity Grouping Logic ---
#     final_entities = []
#     i = 0
#     while i < len(sorted_predictions):
#         pred = sorted_predictions[i]
#         if pred['label'] == 'O':
#             i += 1
#             continue

#         anchor_pred = pred
#         lookbehind_parts = []
#         last_merged_start = anchor_pred['start']
#         temp_idx = i - 1
#         while temp_idx >= 0:
#             prev_pred = sorted_predictions[temp_idx]
#             if prev_pred['end'] == last_merged_start and prev_pred['label'] == 'O':
#                 lookbehind_parts.insert(0, prev_pred)
#                 last_merged_start = prev_pred['start']
#                 temp_idx -= 1
#             else:
#                 break

#         current_entity_tokens = lookbehind_parts + [anchor_pred]

#         k = i + 1
#         while k < len(sorted_predictions):
#             next_pred = sorted_predictions[k]
#             last_token = current_entity_tokens[-1]

#             # Rule 1: Always merge physically contiguous tokens
#             if last_token['end'] == next_pred['start']:
#                 current_entity_tokens.append(next_pred)
#                 k += 1
#                 continue

#             # Rule 2: Merge across a small gap ONLY if the next token is also a PII tag
#             gap_text = text[last_token['end']:next_pred['start']]
#             is_small_gap = 1 <= len(gap_text) <= 5 and all(c in ' :-,.' for c in gap_text)

#             if is_small_gap and next_pred['label'] != 'O':
#                 current_entity_tokens.append(next_pred)
#                 k += 1
#                 continue

#             break

#         final_label_raw = anchor_pred['label']
#         final_label_type = final_label_raw[2:]
#         start_offset = current_entity_tokens[0]['start']
#         end_offset = current_entity_tokens[-1]['end']

#         final_entities.append({
#             "word": text[start_offset:end_offset],
#             "label": final_label_type,
#             "start": start_offset,
#             "end": end_offset
#         })
#         i = k

#     return final_entities


# def predict_explicit_pii(text: str):
#     """
#     Enhanced Debug Version to pinpoint the final merging issue.
#     """
#     print("\n--- STARTING PREDICTION ---")

#     # Tokenize the input text
#     tokens = tokenizer(text, return_offsets_mapping=True, truncation=False)
#     input_ids = tokens['input_ids']
#     offset_mapping = tokens['offset_mapping']
#     total_length = len(input_ids)

#     all_token_predictions = []

#     # Process in chunks
#     for i in range(0, total_length, MAX_LENGTH - OVERLAP):
#         chunk_start_token_idx = i
#         chunk_end_token_idx = min(i + MAX_LENGTH, total_length)
#         chunk_input_ids = input_ids[chunk_start_token_idx:chunk_end_token_idx]
#         chunk_offsets = offset_mapping[chunk_start_token_idx:chunk_end_token_idx]
#         input_tensor = torch.tensor([chunk_input_ids])

#         with torch.no_grad():
#             outputs = model(input_tensor)
#             predictions = torch.argmax(outputs.logits, dim=2)

#         predicted_labels = [index_to_label[p.item()] for p in predictions[0]]

#         for label, offset in zip(predicted_labels, chunk_offsets):
#             if offset[0] == offset[1]: continue
#             all_token_predictions.append({"label": label, "start": offset[0], "end": offset[1], "word": text[offset[0]:offset[1]]})

#     unique_predictions_by_start = {pred['start']: pred for pred in all_token_predictions}
#     sorted_predictions = sorted(unique_predictions_by_start.values(), key=lambda x: x['start'])

#     print("\n--- All Predicted Tokens (Most Important Log) ---")
#     for p in sorted_predictions:
#         print(p)
#     print("--------------------------------------------------\n")

#     final_entities = []
#     i = 0
#     while i < len(sorted_predictions):
#         pred = sorted_predictions[i]
#         if pred['label'] == 'O':
#             i += 1
#             continue

#         anchor_pred = pred
#         lookbehind_parts = []
#         last_merged_start = anchor_pred['start']
#         temp_idx = i - 1
#         while temp_idx >= 0:
#             prev_pred = sorted_predictions[temp_idx]
#             if prev_pred['end'] == last_merged_start and prev_pred['label'] == 'O':
#                 lookbehind_parts.insert(0, prev_pred)
#                 last_merged_start = prev_pred['start']
#                 temp_idx -= 1
#             else:
#                 break

#         current_entity_tokens = lookbehind_parts + [anchor_pred]

#         k = i + 1
#         while k < len(sorted_predictions):
#             next_pred = sorted_predictions[k]
#             last_token = current_entity_tokens[-1]

#             # --- Merge Analysis ---
#             should_merge = False

#             # Rule 1: Contiguous
#             if last_token['end'] == next_pred['start']:
#                 should_merge = True

#             # Rule 2: Small Gap
#             else:
#                 gap_text = text[last_token['end']:next_pred['start']]
#                 gap_len = len(gap_text)
#                 is_small_gap = 1 <= gap_len <= 5 and all(c in ' :-,.' for c in gap_text)

#                 if is_small_gap and next_pred['label'] != 'O':
#                     should_merge = True
#                 else:
#                     # --- DETAILED LOG FOR FAILED MERGE ---
#                     print("\n--- MERGE FAILED ---")
#                     print(f"Current Entity: [{' '.join(tok['word'] for tok in current_entity_tokens)}]")
#                     print(f"Could not merge next token: {next_pred}")
#                     print(f"--- Gap Analysis ---")
#                     print(f"Gap Text: '{gap_text}'")
#                     print(f"Gap Length: {gap_len} (Rule requires 1-5)")
#                     print(f"Is Small Gap & Junk Chars?: {is_small_gap}")
#                     print(f"Is Next Token PII?: {next_pred['label'] != 'O'}")
#                     print("----------------------\n")
#                     # --- END DEBUG LOG ---

#             if should_merge:
#                 current_entity_tokens.append(next_pred)
#                 k += 1
#             else:
#                 break

#         start_offset = current_entity_tokens[0]['start']
#         end_offset = current_entity_tokens[-1]['end']
#         final_entities.append({
#             "word": text[start_offset:end_offset],
#             "label": f"B_{anchor_pred['label'][2:]}",
#             "start": start_offset,
#             "end": end_offset
#         })
#         i = k

#     print("\n--- FINAL DETECTED ENTITIES ---")
#     print(final_entities)
#     print("-----------------------------\n")
#     return final_entities

# tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
# model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
# model.eval()

# index_to_label = {
#     0: 'B_Account', 1: 'B_Address', 2: 'B_Asset', 3: 'B_Balance',
#     4: 'B_Blood_Pressure', 5: 'B_Blood_Type', 6: 'B_Body_Height', 7: 'B_Body_Weight',
#     8: 'B_Card_Number', 9: 'B_Criminal_Hist', 10: 'B_DOB', 11: 'B_Edu_Hist',
#     12: 'B_Gender', 13: 'B_Location', 14: 'B_Mail', 15: 'B_Marr_Status',
#     16: 'B_Med_Hist', 17: 'B_NIP', 18: 'B_Name', 19: 'B_Nickname', 20: 'B_Occ_Hist',
#     21: 'B_POB', 22: 'B_Parent_Name', 23: 'B_Phone_Number', 24: 'B_Plate',
#     25: 'B_Race', 26: 'B_Religion', 27: 'B_SSN', 28: 'B_Salary', 29: 'B_Score',
#     30: 'B_Username', 31: 'B_Work_Mail', 32: 'B_Work_Phone_Number',
#     33: 'I_Account', 34: 'I_Address', 35: 'I_Asset', 36: 'I_Balance',
#     37: 'I_Blood_Pressure', 38: 'I_Blood_Type', 39: 'I_Body_Height',
#     40: 'I_Body_Weight', 41: 'I_Card_Number', 42: 'I_Criminal_Hist', 43: 'I_DOB',
#     44: 'I_Edu_Hist', 45: 'I_Gender', 46: 'I_Location', 47: 'I_Mail',
#     48: 'I_Marr_Status', 49: 'I_Med_Hist', 50: 'I_NIP', 51: 'I_Name',
#     52: 'I_Occ_Hist', 53: 'I_POB', 54: 'I_Parent_Name', 55: 'I_Phone_Number',
#     56: 'I_Plate', 57: 'I_Race', 58: 'I_Religion', 59: 'I_SSN', 60: 'I_Salary',
#     61: 'I_Score', 62: 'I_Username', 63: 'I_Work_Mail', 64: 'I_Work_Phone_Number',
#     65: 'O'
# }

# def preprocess_input(text: str) -> str:
#     return text.strip()

# def predict_explicit_pii(text: str):
#     # Tokenize the input text
#     tokens = tokenizer(text, return_offsets_mapping=True, truncation=False)
#     input_ids = tokens['input_ids']
#     offset_mapping = tokens['offset_mapping']
#     total_length = len(input_ids)

#     # List to store all individual token predictions from all chunks
#     all_token_predictions = []

#     # Process the text in chunks
#     for i in range(0, total_length, MAX_LENGTH - OVERLAP):
#         chunk_start_token_idx = i
#         chunk_end_token_idx = min(i + MAX_LENGTH, total_length)
#         chunk_input_ids = input_ids[chunk_start_token_idx:chunk_end_token_idx]
#         chunk_offsets = offset_mapping[chunk_start_token_idx:chunk_end_token_idx]
#         input_tensor = torch.tensor([chunk_input_ids])

#         with torch.no_grad():
#             outputs = model(input_tensor)
#             predictions = torch.argmax(outputs.logits, dim=2)

#         predicted_labels = [index_to_label[p.item()] for p in predictions[0]]

#         for label, offset in zip(predicted_labels, chunk_offsets):
#             if offset[0] == offset[1]: continue
#             all_token_predictions.append({"label": label, "start": offset[0], "end": offset[1]})

#     # De-duplicate predictions based on start offset
#     unique_predictions_by_start = {pred['start']: pred for pred in all_token_predictions}
#     sorted_predictions = sorted(unique_predictions_by_start.values(), key=lambda x: x['start'])

#     # <-- FIX: Start of final, robust entity reconstruction logic
#     final_entities = []
#     if not sorted_predictions:
#         return []

#     current_entity = []
#     for pred in sorted_predictions:
#         label = pred['label']

#         if not current_entity:
#             if label != 'O':
#                 current_entity.append(pred)
#             continue

#         last_token = current_entity[-1]

#         # Condition 1: Is the new token physically connected to the last one?
#         is_contiguous = pred['start'] == last_token['end']

#         # Condition 2: Is the new token an 'I' tag of the same type?
#         is_matching_inside_tag = (label.startswith('I_') and
#                                   last_token['label'] != 'O' and
#                                   label[2:] == last_token['label'][2:])

#         if is_contiguous or is_matching_inside_tag:
#             current_entity.append(pred)
#         else:
#             # The entity has ended, finalize it
#             start_offset = current_entity[0]['start']
#             end_offset = current_entity[-1]['end']
#             # Use the label of the first token for the whole entity
#             entity_label = current_entity[0]['label']
#             if not entity_label.startswith('B_'):
#                  entity_label = 'B_' + entity_label[2:]

#             final_entities.append({
#                 "word": text[start_offset:end_offset],
#                 "label": entity_label
#             })

#             # Start a new entity if the current token is not 'O'
#             if label != 'O':
#                 current_entity = [pred]
#             else:
#                 current_entity = []

#     # Add the last entity if it exists after the loop
#     if current_entity:
#         start_offset = current_entity[0]['start']
#         end_offset = current_entity[-1]['end']
#         entity_label = current_entity[0]['label']
#         if not entity_label.startswith('B_'):
#             entity_label = 'B_' + entity_label[2:]
#         final_entities.append({
#             "word": text[start_offset:end_offset],
#             "label": entity_label
#         })
#     # <-- FIX: End of new logic

#     return final_entities

# def predict_explicit_pii(text: str):
#     # Tokenize the input text
#     tokens = tokenizer(text, return_offsets_mapping=True, truncation=False)
#     input_ids = tokens['input_ids']
#     offset_mapping = tokens['offset_mapping']
#     total_length = len(input_ids)

#     # List to store all individual token predictions from all chunks
#     all_token_predictions = []

#     # Process the text in chunks
#     for i in range(0, total_length, MAX_LENGTH - OVERLAP):
#         chunk_start_token_idx = i
#         chunk_end_token_idx = min(i + MAX_LENGTH, total_length)
#         chunk_input_ids = input_ids[chunk_start_token_idx:chunk_end_token_idx]
#         chunk_offsets = offset_mapping[chunk_start_token_idx:chunk_end_token_idx]
#         input_tensor = torch.tensor([chunk_input_ids])

#         with torch.no_grad():
#             outputs = model(input_tensor)
#             predictions = torch.argmax(outputs.logits, dim=2)

#         predicted_labels = [index_to_label[p.item()] for p in predictions[0]]

#         for label, offset in zip(predicted_labels, chunk_offsets):
#             if offset[0] == offset[1]: continue
#             all_token_predictions.append({"label": label, "start": offset[0], "end": offset[1]})

#     # De-duplicate predictions based on start offset
#     unique_predictions_by_start = {pred['start']: pred for pred in all_token_predictions}
#     sorted_predictions = sorted(unique_predictions_by_start.values(), key=lambda x: x['start'])

#     # This logic correctly groups B- (Begin) and I- (Inside) tags into complete entities.
#     final_entities = []
#     if not sorted_predictions:
#         return []

#     current_entity = []
#     for pred in sorted_predictions:
#         label = pred['label']

#         if not current_entity:
#             if label != 'O':
#                 current_entity.append(pred)
#             continue

#         last_token = current_entity[-1]

#         # Condition 1: Is the new token physically connected to the last one?
#         is_contiguous = pred['start'] == last_token['end']

#         # Condition 2: Is the new token an 'I' tag of the same type?
#         is_matching_inside_tag = (label.startswith('I_') and
#                                   last_token['label'] != 'O' and
#                                   label[2:] == last_token['label'][2:])

#         if is_contiguous or is_matching_inside_tag:
#             current_entity.append(pred)
#         else:
#             # The entity has ended, finalize it
#             start_offset = current_entity[0]['start']
#             end_offset = current_entity[-1]['end']
#             entity_label = current_entity[0]['label']
#             if not entity_label.startswith('B_'):
#                  entity_label = 'B_' + entity_label[2:]

#             final_entities.append({
#                 "word": text[start_offset:end_offset],
#                 "label": entity_label,
#                 "start": start_offset,
#                 "end": end_offset
#             })

#             # Start a new entity if the current token is not 'O'
#             if label != 'O':
#                 current_entity = [pred]
#             else:
#                 current_entity = []

#     # Add the last entity if it exists after the loop
#     if current_entity:
#         start_offset = current_entity[0]['start']
#         end_offset = current_entity[-1]['end']
#         entity_label = current_entity[0]['label']
#         if not entity_label.startswith('B_'):
#             entity_label = 'B_' + entity_label[2:]
#         final_entities.append({
#             "word": text[start_offset:end_offset],
#             "label": entity_label,
#             "start": start_offset,
#             "end": end_offset
#         })

#     return final_entities

# def predict_explicit_pii(text: str):
#     # Tokenize the input text
#     tokens = tokenizer(text, return_offsets_mapping=True, truncation=False)
#     input_ids = tokens['input_ids']
#     offset_mapping = tokens['offset_mapping']
#     total_length = len(input_ids)

#     # List to store all individual token predictions from all chunks
#     all_token_predictions = []

#     # Process the text in chunks
#     for i in range(0, total_length, MAX_LENGTH - OVERLAP):
#         chunk_start_token_idx = i
#         chunk_end_token_idx = min(i + MAX_LENGTH, total_length)
#         chunk_input_ids = input_ids[chunk_start_token_idx:chunk_end_token_idx]
#         chunk_offsets = offset_mapping[chunk_start_token_idx:chunk_end_token_idx]
#         input_tensor = torch.tensor([chunk_input_ids])

#         with torch.no_grad():
#             outputs = model(input_tensor)
#             predictions = torch.argmax(outputs.logits, dim=2)

#         predicted_labels = [index_to_label[p.item()] for p in predictions[0]]

#         for label, offset in zip(predicted_labels, chunk_offsets):
#             if offset[0] == offset[1]: continue
#             all_token_predictions.append({"label": label, "start": offset[0], "end": offset[1]})

#     # De-duplicate predictions based on start offset
#     unique_predictions_by_start = {pred['start']: pred for pred in all_token_predictions}
#     sorted_predictions = sorted(unique_predictions_by_start.values(), key=lambda x: x['start'])

#     final_entities = []
#     if not sorted_predictions:
#         return []

#     current_entity_tokens = []
#     for pred in sorted_predictions:
#         current_label = pred['label']

#         if not current_entity_tokens:
#             if current_label != 'O':
#                 current_entity_tokens.append(pred)
#             continue

#         last_token = current_entity_tokens[-1]

#         # --- ENHANCED LOGIC ---
#         # The entity type is determined by its FIRST token. This avoids breaking the merge chain.
#         is_building_pii_entity = current_entity_tokens[0]['label'] != 'O'

#         # Rule 1: Are the tokens physically part of the same word (contiguous)?
#         is_contiguous = (last_token['end'] == pred['start'])

#         # Rule 2: Standard B-I pairing of the same type.
#         last_label = last_token['label']
#         last_label_type = last_label[2:] if last_label != 'O' else 'O'
#         current_label_type = current_label[2:] if current_label != 'O' else 'O'
#         is_matching_inside_tag = (current_label.startswith('I_') and last_label != 'O' and current_label_type == last_label_type)

#         # Rule 3: Two B-tags of the same type separated by a small gap of whitespace/punctuation.
#         is_sequential_begin_tag = False
#         if not is_contiguous:
#             if current_label.startswith('B_') and last_label != 'O' and current_label_type == last_label_type:
#                 gap_text = text[last_token['end']:pred['start']]
#                 if len(gap_text) <= 5 and all(c in ' :-,.' for c in gap_text):
#                     is_sequential_begin_tag = True

#         # --- DECISION HIERARCHY ---
#         if is_contiguous and is_building_pii_entity:
#             # Priority 1: If building a PII entity and tokens are contiguous, always merge.
#             current_entity_tokens.append(pred)
#         elif is_matching_inside_tag:
#             # Priority 2: Standard B-I tagging.
#             current_entity_tokens.append(pred)
#         elif is_sequential_begin_tag:
#             # Priority 3: Merge across small gaps.
#             current_entity_tokens.append(pred)
#         else:
#             # The entity has ended. Finalize the current one and start a new one.
#             start_offset = current_entity_tokens[0]['start']
#             end_offset = current_entity_tokens[-1]['end']
#             entity_label_raw = current_entity_tokens[0]['label']
#             entity_label_type = entity_label_raw[2:]

#             final_entities.append({
#                 "word": text[start_offset:end_offset],
#                 "label": f"B_{entity_label_type}",
#                 "start": start_offset,
#                 "end": end_offset
#             })

#             if current_label != 'O':
#                 current_entity_tokens = [pred]
#             else:
#                 current_entity_tokens = []

#     if current_entity_tokens:
#         start_offset = current_entity_tokens[0]['start']
#         end_offset = current_entity_tokens[-1]['end']
#         entity_label_raw = current_entity_tokens[0]['label']
#         entity_label_type = entity_label_raw[2:]

#         final_entities.append({
#             "word": text[start_offset:end_offset],
#             "label": f"B_{entity_label_type}",
#             "start": start_offset,
#             "end": end_offset
#         })

#     return final_entities

