from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import httpx
from app.config import settings

router = APIRouter()

class Description(BaseModel):
    raw_description: str

class EnhancedDescription(BaseModel):
    enhanced_description: str

GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.gemini_api_key}"

@router.post("/enhance-description", response_model=EnhancedDescription)
async def enhance_description(description: Description):
    prompt = f"This call is from a project called Issue Tracker (a Jira-like system to track work). The user has written the issue description in their own words, and may have left out some details. Kindly rephrase and enhance it if possible — but do not ask the user to provide extra input. This response will be stored directly in the database and not shown back to the user for confirmation. dont give options to user, as this text is directly going to database. Here is the text to improve\n\n'{description.raw_description}'"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(GEMINI_API_URL, json=payload, headers={"Content-Type": "application/json"})
            response.raise_for_status() # Raises an exception for 4XX/5XX responses
            
            data = response.json()
            enhanced_text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text')

            if not enhanced_text:
                raise HTTPException(status_code=500, detail="Failed to get enhanced description from Gemini API.")

            return EnhancedDescription(enhanced_description=enhanced_text.strip())

    except httpx.HTTPStatusError as e:
        # Forward the error from Gemini API if possible
        error_detail = e.response.json().get("error", {}).get("message", str(e))
        raise HTTPException(status_code=e.response.status_code, detail=error_detail)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
