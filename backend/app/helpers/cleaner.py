from typing import Literal
import re

def clean_text(text: str,case:Literal["lower","title"]="lower") -> str:
        """
        Clean and normalize text for preprocessing.

        The cleaning process:
        - Converts text to lowercase
        - Removes URLs
        - Removes HTML tags
        - Removes mentions and hashtags
        - Removes non-alphabetic characters
        - Reduces repeated characters
        - Normalizes whitespace

        Args:
            text: Input text to clean.
            case: Output text casing ("lower" or "title").

        Returns:
            str: The cleaned and normalized text.
        """
        if not isinstance(text, str):
            return ""

        text = text.lower()
        text = re.sub(r'http\S+|www\S+', '', text)
        text = re.sub(r'<.*?>', '', text)
        text = re.sub(r'@\w+|#\w+', '', text)
        text = re.sub(r'[^a-z\s]', '', text)
        text = re.sub(r'(.)\1+', r'\1\1', text)

        if case == "title":
            text = text.title()

        return " ".join(text.split())