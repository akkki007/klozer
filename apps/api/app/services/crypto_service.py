"""
AES-Fernet symmetric encryption for OAuth tokens stored in the database.
TOKEN_ENC_KEY must be a valid Fernet key (32 url-safe base64 bytes).

Generate one with:
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
from cryptography.fernet import Fernet, InvalidToken
from app.config import settings


def _fernet() -> Fernet:
    if not settings.TOKEN_ENC_KEY:
        raise RuntimeError("TOKEN_ENC_KEY is not set — cannot encrypt/decrypt OAuth tokens")
    return Fernet(settings.TOKEN_ENC_KEY.encode())


def encrypt_token(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as e:
        raise ValueError("Token decryption failed — key mismatch or corrupted data") from e
