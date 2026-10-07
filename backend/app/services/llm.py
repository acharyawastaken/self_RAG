from typing import Optional, Dict, Any
import json
import ollama
from backend.app.config import get_settings

settings = get_settings()


class LLMServiceError(Exception):
    pass


# Global hook for test mocking
_mock_llm_response = None


def set_mock_llm_response(response_fn):
    global _mock_llm_response
    _mock_llm_response = response_fn


def clear_mock_llm_response():
    global _mock_llm_response
    _mock_llm_response = None


def generate_completion(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    json_mode: bool = False,
) -> str:
    global _mock_llm_response
    if _mock_llm_response is not None:
        return _mock_llm_response(prompt, json_mode)

    model_name = model or settings.llm_model
    temp = temperature if temperature is not None else settings.llm_temperature

    try:
        client = ollama.Client(host=settings.ollama_host, timeout=settings.llm_timeout_s)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        options = {"temperature": temp}
        kwargs: Dict[str, Any] = {
            "model": model_name,
            "messages": messages,
            "options": options,
        }
        if json_mode:
            kwargs["format"] = "json"

        response = client.chat(**kwargs)
        return response["message"]["content"].strip()
    except Exception as e:
        raise LLMServiceError(
            f"Failed to communicate with Ollama at {settings.ollama_host} (Model: {model_name}): {str(e)}. "
            "Please ensure Ollama is running ('ollama serve') and the model is pulled ('ollama pull llama3.1:8b')."
        )
