import os
import json
import asyncio
from typing import Optional
import aiohttp

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = "gemini-2.5-flash"
        self._session = None

    async def _get_session(self):
        if self._session is None:
            self._session = aiohttp.ClientSession()
        return self._session

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        if not self.api_key:
            print("No GEMINI_API_KEY configured")
            return None
        
        try:
            session = await self._get_session()
            
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
            
            contents = []
            if system_prompt:
                contents.append({"role": "user", "parts": [{"text": system_prompt}]})
            contents.append({"role": "user", "parts": [{"text": prompt}]})
            
            payload = {
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 2048,
                    "topP": 0.95,
                    "topK": 40
                }
            }
            
            async with session.post(url, json=payload) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                else:
                    error_text = await resp.text()
                    print(f"LLM API error: {resp.status} - {error_text}")
                    return None
        except asyncio.TimeoutError:
            print("LLM API timeout")
            return None
        except Exception as e:
            print(f"LLM generation error: {e}")
            return None

    async def generate_json(self, prompt: str, schema: dict) -> Optional[dict]:
        schema_prompt = f"""Respond ONLY with valid JSON matching this schema:
{json.dumps(schema)}

User request:
{prompt}"""
        
        result = await self.generate(schema_prompt)
        if result:
            try:
                result = result.strip()
                if "```json" in result:
                    result = result.split("```json")[1].split("```")[0]
                elif "```" in result:
                    result = result.split("```")[1].split("```")[0]
                return json.loads(result)
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {e}, result: {result}")
                return None
        return None

    async def close(self):
        if self._session:
            await self._session.close()
            self._session = None

llm_service = LLMService()