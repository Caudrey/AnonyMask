from mask_config import mask_additional_words, excluded_words, partial_mask

def mask_text(text: str) -> list:
    words = text.split()
    masked_words = []

    for word in words:
        if word in excluded_words:
            masked_words.append(word)
        elif word in mask_additional_words:
            masked_words.append("[MASKED]")
        elif "@" in word:
            masked_words.append(partial_mask(word))
        else:
            masked_words.append(word)

    return " ".join(masked_words)
