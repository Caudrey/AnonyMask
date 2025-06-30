mask_additional_words = set()
excluded_words = set()

def set_mask_words(new_words):
    global mask_additional_words
    mask_additional_words = set(new_words)

def set_excluded_words(new_words):
    global excluded_words
    excluded_words = set(new_words)

def partial_mask(word):
    if "@" in word:
        user, domain = word.split("@", 1)
        return f"{user[0]}***@{domain}"
    elif len(word) > 4:
        return word[0] + "*"*(len(word)-2) + word[-1]
    return "*" * len(word)
