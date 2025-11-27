from openai import OpenAI
from backend.core.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def build_sensor_context() -> str:
    text = "ตอนนี้ยังไม่ได้เชื่อมข้อมูลเซนเซอร์จาก Dropbox ให้เรียบร้อย โค้ดนี้เป็นตัวอย่างการต่อ OpenAI เท่านั้น"
    return text

def ask_carbon_status(user_message: str) -> str:
    sensor_context = build_sensor_context()

    system_prompt = (
        "คุณคือผู้ช่วยด้านสิ่งแวดล้อมสำหรับระบบ IoT "
        "ใช้ข้อมูลสภาพแวดล้อมที่ให้ไปเพื่ออธิบายสถานะการดูดซับคาร์บอน "
        "ตอบเป็นภาษาไทย ใช้คำง่ายๆ ไม่ยาวเกินไป"
    )

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": sensor_context},
            {"role": "user", "content": user_message},
        ],
    )

    return completion.choices[0].message.content