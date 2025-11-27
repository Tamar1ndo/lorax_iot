# backend/core/ollama_service.py
import requests
import math
from typing import Optional

from backend.dropbox.service import (
    get_sensor_cache,
    CO2_COL,
    TEMP_COL,
    HUMID_COL,
    LEAF_COL,
    GROUND_COL,
)

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL_NAME = "llama3"


def _fmt(x: Optional[float]) -> str:
    if x is None:
        return "-"
    if isinstance(x, float) and (math.isnan(x) or math.isinf(x)):
        return "-"
    return f"{x:.2f}"


def build_sensor_context() -> str:
    cache = get_sensor_cache()
    wise4051 = cache["wise4051"]["data"]
    wise4012 = cache["wise4012"]["data"]
    updated4051 = cache["wise4051"]["last_updated"]
    updated4012 = cache["wise4012"]["last_updated"]

    if wise4051 is None or wise4051.empty:
        return "ยังไม่มีข้อมูลเซนเซอร์จากระบบใน cache"

    # ---------- 4051: CO₂ / Temp / Humid ----------
    latest4051 = wise4051.iloc[-1]

    co2_latest = latest4051.get(CO2_COL)
    temp_latest = latest4051.get(TEMP_COL)
    humid_latest = latest4051.get(HUMID_COL)

    # ใช้ช่วงล่าสุดประมาณ 60 จุด (แล้วแต่ว่า aggregate มาเป็น 5 นาที ฯลฯ)
    window = wise4051.tail(60)
    co2_mean = window[CO2_COL].mean() if CO2_COL in window.columns else None
    co2_first = window[CO2_COL].iloc[0] if CO2_COL in window.columns and len(window) > 0 else None
    co2_min = window[CO2_COL].min() if CO2_COL in window.columns else None
    co2_max = window[CO2_COL].max() if CO2_COL in window.columns else None

    # แนวโน้ม: ดูว่าล่าสุดต่ำกว่าค่าแรกใน window หรือไม่
    co2_trend_text = "ไม่ทราบแนวโน้ม"
    if co2_latest is not None and co2_first is not None:
        diff = co2_latest - co2_first
        if diff < -10:
            co2_trend_text = "CO₂ มีแนวโน้มลดลงในช่วงล่าสุด"
        elif diff > 10:
            co2_trend_text = "CO₂ มีแนวโน้มเพิ่มขึ้นในช่วงล่าสุด"
        else:
            co2_trend_text = "CO₂ ค่อนข้างทรงตัวในช่วงล่าสุด"

    # ประเมินสภาพ Temp / Humid แบบง่าย ๆ
    temp_status = "ไม่ทราบ"
    if temp_latest is not None and not math.isnan(temp_latest):
        if 22 <= temp_latest <= 32:
            temp_status = "อยู่ในช่วงเหมาะสมต่อการสังเคราะห์แสง (ประมาณ 22–32°C)"
        elif temp_latest < 22:
            temp_status = "ค่อนข้างเย็น อาจทำให้การสังเคราะห์แสงช้าลง"
        else:
            temp_status = "ค่อนข้างร้อน อาจทำให้พืชเครียดและลดประสิทธิภาพการสังเคราะห์แสง"

    humid_status = "ไม่ทราบ"
    if humid_latest is not None and not math.isnan(humid_latest):
        if 40 <= humid_latest <= 70:
            humid_status = "ความชื้นอยู่ในช่วงเหมาะสมต่อพืช (ประมาณ 40–70%)"
        elif humid_latest < 40:
            humid_status = "ความชื้นต่ำ อาจทำให้พืชเสียน้ำง่าย"
        else:
            humid_status = "ความชื้นสูง อาจเสี่ยงต่อเชื้อรา"

    updated4051_text = (
        updated4051.strftime("%Y-%m-%d %H:%M:%S") if updated4051 else "ไม่ทราบเวลาอัปเดต"
    )

    # ---------- 4012: Leaf / Ground bioelectric ----------
    leaf_latest = None
    ground_latest = None
    updated4012_text = "ไม่ทราบเวลาอัปเดต"

    if wise4012 is not None and not wise4012.empty:
        latest4012 = wise4012.iloc[-1]
        leaf_latest = latest4012.get(LEAF_COL)
        ground_latest = latest4012.get(GROUND_COL)
        if updated4012:
            updated4012_text = updated4012.strftime("%Y-%m-%d %H:%M:%S")

    context = f"""
ข้อมูลเซนเซอร์จากระบบ Decarbonator3000

[WISE-4051 | CO₂ / Temp / Humid]
- เวลาอัปเดตล่าสุด: {updated4051_text}
- CO₂ ล่าสุด: {_fmt(co2_latest)} ppm
- CO₂ เฉลี่ยช่วงล่าสุด: {_fmt(co2_mean)} ppm
- CO₂ ต่ำสุดในช่วงล่าสุด: {_fmt(co2_min)} ppm
- CO₂ สูงสุดในช่วงล่าสุด: {_fmt(co2_max)} ppm
- แนวโน้ม CO₂: {co2_trend_text}

- อุณหภูมิล่าสุด: {_fmt(temp_latest)} °C  → {temp_status}
- ความชื้นล่าสุด: {_fmt(humid_latest)} % → {humid_status}

[WISE-4012 | Leaf / Ground Bioelectric]
- เวลาอัปเดตล่าสุด: {updated4012_text}
- Leaf bioelectric ล่าสุด: {_fmt(leaf_latest)}
- Ground bioelectric ล่าสุด: {_fmt(ground_latest)}

สรุปแนวคิดสำหรับการวิเคราะห์:
- ถ้า CO₂ มีแนวโน้มลดลง พร้อมกับอุณหภูมิและความชื้นอยู่ในช่วงเหมาะสม มักบ่งบอกว่าการสังเคราะห์แสงและการดูดซับคาร์บอนของพืชทำงานได้ดี
- สัญญาณ bioelectric ของใบและดินอาจใช้ช่วยยืนยันระดับ activity ของพืช (เช่น ถ้าสัญญาณนิ่งมากผิดปกติ อาจบ่งชี้ว่าพืชเครียดหรือไม่ active)
"""
    return context.strip()


def ask_carbon_status_ollama(user_message: str) -> str:
    system_prompt = """
คุณคือผู้ช่วยวิเคราะห์สภาพแวดล้อมและการดูดซับคาร์บอน
สำหรับโครงการ Decarbonator3000 ซึ่งมีเซนเซอร์ดังนี้:

- CO₂ (ppm) จาก WISE-4051
- อุณหภูมิ (°C) และความชื้น (%) จาก WISE-4051
- Leaf และ Ground bioelectric จาก WISE-4012

หน้าที่ของคุณ:
1. สรุปสถานะภาพรวมของการดูดซับคาร์บอนในตอนนี้ จาก CO₂ + Temp + Humid
2. วิเคราะห์แนวโน้ม CO₂ (เพิ่มขึ้น / ลดลง / ทรงตัว) โดยอ้างอิงข้อมูลช่วงล่าสุด
3. ใช้ Temp และ Humid ช่วยอธิบายว่าแนวโน้ม CO₂ นั้น "สมเหตุสมผล" หรือไม่
   - ถ้า CO₂ ลดลง + Temp/Humid อยู่ในช่วงดี → ให้ชี้ว่าพืชน่าจะกำลังสังเคราะห์แสงได้ดี
   - ถ้า CO₂ สูงขึ้น + Temp/Humid ไม่เหมาะสม → ให้เตือนว่าพืชอาจเครียด/ดูดซับไม่ดี
4. ถ้ามีข้อมูล bioelectric ให้ใช้ช่วยเสริมความน่าเชื่อถือ เช่น ระดับ activity ของพืช
5. ตอบเป็นภาษาไทย ใช้คำง่าย ๆ ไม่เกิน 3 ย่อหน้า
6. ถ้าผู้ใช้ถามค่าใดค่าหนึ่ง เช่น "ตอนนี้ leaf bioelectric เท่าไหร่" ให้ตอบตัวเลขล่าสุดจาก context โดยอธิบายสั้น ๆ

รูปแบบคำตอบ:
- ย่อหน้าแรก: สถานะรวม (ดีมาก / ปกติ / ควรตรวจสอบ) พร้อมสรุปสั้น ๆ
- ย่อหน้าที่สอง: อธิบายตัวเลขสำคัญ เช่น CO₂ trend, Temp, Humid, Bioelectric
- ย่อหน้าสุดท้าย: ข้อเสนอแนะง่าย ๆ (เช่น ปรับการระบายอากาศ หรือเฝ้าดูต่อ)
"""

    sensor_context = build_sensor_context()

    payload = {
        "model": MODEL_NAME,
        "stream": False,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": sensor_context},
            {"role": "user", "content": user_message},
        ],
    }

    resp = requests.post(OLLAMA_URL, json=payload)
    resp.raise_for_status()
    data = resp.json()
    return data["message"]["content"]