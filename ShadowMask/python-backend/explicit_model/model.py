import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification

MODEL_PATH = "./explicit_model"

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
model.eval()

index_to_label = {
    0: 'B_Account', 1: 'B_Address', 2: 'B_Asset', 3: 'B_Balance',
    4: 'B_Blood_Pressure', 5: 'B_Blood_Type', 6: 'B_Body_Height', 7: 'B_Body_Weight',
    8: 'B_Card_Number', 9: 'B_Criminal_Hist', 10: 'B_DOB', 11: 'B_Edu_Hist',
    12: 'B_Gender', 13: 'B_Location', 14: 'B_Mail', 15: 'B_Marr_Status',
    16: 'B_Med_Hist', 17: 'B_NIP', 18: 'B_Name', 19: 'B_Nickname', 20: 'B_Occ_Hist',
    21: 'B_POB', 22: 'B_Parent_Name', 23: 'B_Phone_Number', 24: 'B_Plate',
    25: 'B_Race', 26: 'B_Religion', 27: 'B_SSN', 28: 'B_Salary', 29: 'B_Score',
    30: 'B_Username', 31: 'B_Work_Mail', 32: 'B_Work_Phone_Number',
    33: 'I_Account', 34: 'I_Address', 35: 'I_Asset', 36: 'I_Balance',
    37: 'I_Blood_Pressure', 38: 'I_Blood_Type', 39: 'I_Body_Height',
    40: 'I_Body_Weight', 41: 'I_Card_Number', 42: 'I_Criminal_Hist', 43: 'I_DOB',
    44: 'I_Edu_Hist', 45: 'I_Gender', 46: 'I_Location', 47: 'I_Mail',
    48: 'I_Marr_Status', 49: 'I_Med_Hist', 50: 'I_NIP', 51: 'I_Name',
    52: 'I_Occ_Hist', 53: 'I_POB', 54: 'I_Parent_Name', 55: 'I_Phone_Number',
    56: 'I_Plate', 57: 'I_Race', 58: 'I_Religion', 59: 'I_SSN', 60: 'I_Salary',
    61: 'I_Score', 62: 'I_Username', 63: 'I_Work_Mail', 64: 'I_Work_Phone_Number',
    65: 'O'
}

def preprocess_input(text: str) -> str:
    return text.strip()

def predict_explicit_pii(text: str):
    encoded = tokenizer(text, return_offsets_mapping=True, return_tensors="pt", truncation=True)
    input_ids = encoded["input_ids"]
    attention_mask = encoded["attention_mask"]
    offsets = encoded["offset_mapping"][0]

    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        predictions = torch.argmax(outputs.logits, dim=-1).squeeze()

    tokens = tokenizer.convert_ids_to_tokens(input_ids.squeeze())
    predicted_labels = [index_to_label[p.item()] for p in predictions]

    word_level_output = []
    current_word = ""
    current_label = ""
    last_label = "O"
    last_end = 0

    for token, label, (start, end) in zip(tokens, predicted_labels, offsets):
        if start == end:  # Skip special tokens like [CLS], [SEP]
            continue

        piece = text[start:end]

        if token.startswith("##"):
            current_word += piece  # Continue the subword
        else:
            if current_word:  # Save previous word
                word_level_output.append({"word": current_word, "label": current_label})
            current_word = piece
            current_label = label
            last_label = label
        last_end = end

    if current_word:
        word_level_output.append({"word": current_word, "label": current_label})

    # Filter out non-PII (label == "O")
    word_level_output = [entry for entry in word_level_output if entry["label"] != "O"]

    return word_level_output
