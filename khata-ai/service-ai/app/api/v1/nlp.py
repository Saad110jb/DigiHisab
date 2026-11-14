"""
NLP & Audio Transcription Endpoints for DigiHisab
"""

import base64
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from app.ml.nlp.whisper_runner import whisper_engine
from nlp_engine import parse_voice_transcript, VoiceRequest

router = APIRouter(prefix="/nlp", tags=["Natural Language & Audio"])

class AudioBase64Payload(BaseModel):
    audio_base64: str
    mime_type: Optional[str] = "audio/wav"
    language: Optional[str] = "ur"

class TranscriptParsePayload(BaseModel):
    transcript: str

@router.post("/transcribe")
async def transcribe_audio_file(
    file: Optional[UploadFile] = File(None),
    audio_base64: Optional[str] = Form(None),
    mime_type: Optional[str] = Form("audio/wav"),
    language: Optional[str] = Form("ur")
):
    """
    Transcribes audio file or form-encoded audio bytes to Urdu / Roman-Urdu text.
    """
    audio_bytes = None
    target_mime = mime_type or "audio/wav"

    if file is not None:
        audio_bytes = await file.read()
        if file.content_type:
            target_mime = file.content_type
    elif audio_base64 is not None:
        clean = audio_base64.replace("data:audio/wav;base64,", "").replace("data:audio/webm;base64,", "")
        try:
            audio_bytes = base64.b64decode(clean)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 audio payload")

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file or audio_base64 is required")

    result = whisper_engine.transcribe_audio_bytes(
        audio_bytes=audio_bytes,
        mime_type=target_mime,
        language=language
    )
    return result

@router.post("/transcribe-json")
async def transcribe_audio_json(payload: AudioBase64Payload):
    """
    Transcribes base64 JSON payload.
    """
    clean = payload.audio_base64.replace("data:audio/wav;base64,", "").replace("data:audio/webm;base64,", "")
    try:
        audio_bytes = base64.b64decode(clean)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 string")

    result = whisper_engine.transcribe_audio_bytes(
        audio_bytes=audio_bytes,
        mime_type=payload.mime_type or "audio/wav",
        language=payload.language or "ur"
    )
    return result

@router.post("/parse")
async def parse_text_transcript(payload: TranscriptParsePayload):
    """
    Parses Roman-Urdu or Urdu transcript into structured financial ledger actions.
    """
    req = VoiceRequest(transcript=payload.transcript)
    result = parse_voice_transcript(req)
    return result
