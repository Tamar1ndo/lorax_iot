# backend/dropbox/service.py
import io
from typing import List, Dict, Optional, Literal
from datetime import datetime

import dropbox
import pandas as pd
import numpy as np

from backend.dropbox.env import DROPBOX_TOKEN, WISE4051_ROOT, WISE4012_ROOT

# ─────────────────────────────────────────────────────────────
# Sensor Columns
# ─────────────────────────────────────────────────────────────
CO2_COL = "COM_1 Wd_0"
TEMP_COL = "COM_1 Wd_1"
HUMID_COL = "COM_1 Wd_2"

# raw bioelectric columns from WISE-4012
LEAF_COL = "AI_0 Val"
GROUND_COL = "AI_1 Val"

# ─────────────────────────────────────────────────────────────
# CACHE
# ─────────────────────────────────────────────────────────────

# RAW cache (per root folder)
_cache: Dict[str, pd.DataFrame] = {}

# REALTIME sensor cache for AI / Backend
_sensor_cache = {
    "wise4051": {"data": None, "last_updated": None},  # CO2 / Temp / Humid
    "wise4012": {"data": None, "last_updated": None},  # Leaf / Ground (+ voltage)
}


# ─────────────────────────────────────────────────────────────
# Dropbox Utils
# ─────────────────────────────────────────────────────────────
def get_client() -> dropbox.Dropbox:
    return dropbox.Dropbox(DROPBOX_TOKEN)


def list_date_folders(root_path: str) -> List[str]:
    dbx = get_client()
    res = dbx.files_list_folder(root_path)
    folders: List[str] = []

    while True:
        for entry in res.entries:
            if isinstance(entry, dropbox.files.FolderMetadata):
                # ใช้ path_display ให้ตรงกับ root_path ที่กำหนด
                folders.append(entry.path_display)
        if not res.has_more:
            break
        res = dbx.files_list_folder_continue(res.cursor)

    return folders


def list_csv_files(dbx: dropbox.Dropbox, folder_path: str) -> List[str]:
    res = dbx.files_list_folder(folder_path)
    files: List[str] = []

    while True:
        for entry in res.entries:
            if isinstance(entry, dropbox.files.FileMetadata) and entry.name.lower().endswith(
                ".csv"
            ):
                files.append(entry.path_display)
        if not res.has_more:
            break
        res = dbx.files_list_folder_continue(res.cursor)

    return files


def download_csv_to_df(dbx: dropbox.Dropbox, file_path: str) -> pd.DataFrame:
    _, resp = dbx.files_download(file_path)
    content = resp.content.decode("utf-8", errors="ignore")
    df = pd.read_csv(io.StringIO(content))
    return df


# ─────────────────────────────────────────────────────────────
# Timestamp Builder
# ─────────────────────────────────────────────────────────────
def add_timestamp_column(df: pd.DataFrame) -> pd.DataFrame:
    if "timestamp" in df.columns:
        return df

    # เคส WISE-4051: TIM เป็น ISO time เช่น 2025-11-18T14:44:23+07:00
    if "TIM" in df.columns:
        df["timestamp"] = pd.to_datetime(df["TIM"], errors="coerce")
        return df

    cols = {
        "year": ["Year", "YEAR", "year"],
        "month": ["Month", "MONTH", "month"],
        "day": ["Day", "DAY", "day"],
        "hour": ["Hour", "HOUR", "hour"],
        "minute": ["Minute", "MINUTE", "minute"],
        "second": ["Second", "SECOND", "second"],
    }

    def pick(name):
        for c in cols[name]:
            if c in df.columns:
                return c
        return None

    y, m, d = pick("year"), pick("month"), pick("day")
    h, mn, s = pick("hour"), pick("minute"), pick("second")

    if all([y, m, d, h, mn, s]):
        df["timestamp"] = pd.to_datetime(
            dict(
                year=df[y],
                month=df[m],
                day=df[d],
                hour=df[h],
                minute=df[mn],
                second=df[s],
            ),
            errors="coerce",
        )
        return df

    if "Time" in df.columns:
        df["timestamp"] = pd.to_datetime(df["Time"], errors="coerce")
        return df

    raise ValueError("Cannot detect timestamp columns in CSV.")


# ─────────────────────────────────────────────────────────────
# Read All CSV for a Device
# ─────────────────────────────────────────────────────────────
def read_all_csv_under(
    root_path: str,
    use_cache: bool = True,
    skip_old_data: bool = True,
) -> pd.DataFrame:
    # ใช้ cache ระดับ root ถ้ามี
    if use_cache and root_path in _cache:
        print(f"✅ Using cached data for {root_path}")
        return _cache[root_path]

    print(f"📥 Reading fresh data from Dropbox: {root_path}")

    dbx = get_client()
    all_rows: List[pd.DataFrame] = []

    folders = list_date_folders(root_path)

    # อ่านเฉพาะโฟลเดอร์ล่าสุดเพื่อลดเวลา
    if skip_old_data and len(folders) > 7:
        folders = sorted(folders)[-7:]

    for folder in folders:
        csv_files = list_csv_files(dbx, folder)
        for file_path in csv_files:
            try:
                df = download_csv_to_df(dbx, file_path)
                df = add_timestamp_column(df)
                all_rows.append(df)
            except Exception as e:
                print(f"⚠️ Failed to read {file_path}: {e}")

    if not all_rows:
        return pd.DataFrame()

    print(f"🔄 Concatenating {len(all_rows)} dataframes...")
    df_all = pd.concat(all_rows, ignore_index=True)
    df_all = df_all.sort_values("timestamp").reset_index(drop=True)

    if use_cache:
        _cache[root_path] = df_all
        print(f"💾 Cached {len(df_all)} rows")

    return df_all


# ─────────────────────────────────────────────────────────────
# Export Cleaner
# ─────────────────────────────────────────────────────────────
def df_to_records(df: pd.DataFrame) -> List[Dict]:
    if df.empty:
        return []
    df = df.replace({np.nan: None})
    return df.to_dict(orient="records")


# ─────────────────────────────────────────────────────────────
# Aggregation
# ─────────────────────────────────────────────────────────────
def aggregate_data(
    df: pd.DataFrame,
    interval: Literal["1min", "5min", "15min", "30min", "1hour"],
) -> pd.DataFrame:
    if df.empty:
        return df

    freq_map = {
        "1min": "1T",
        "5min": "5T",
        "15min": "15T",
        "30min": "30T",
        "1hour": "1H",
    }
    freq = freq_map.get(interval, "5T")

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    df_numeric = df[["timestamp"] + numeric_cols].copy()

    df_agg = df_numeric.set_index("timestamp").resample(freq).mean().reset_index()
    return df_agg


# ─────────────────────────────────────────────────────────────
# Bioelectric Voltage Conversion
# ─────────────────────────────────────────────────────────────
def convert_bioelectric_voltage(df: pd.DataFrame) -> pd.DataFrame:
    """
    แปลงค่า raw ADC ของ LEAF_COL / GROUND_COL เป็นโวลต์
    ใช้สูตร: V = (Raw - 32768) * 20 / 65535
    """
    if df is None or df.empty:
        return df

    def adc_to_voltage(raw):
        try:
            return (float(raw) - 32768.0) * (20.0 / 65535.0)
        except Exception:
            return None

    if LEAF_COL in df.columns:
        df["Leaf_Voltage"] = df[LEAF_COL].apply(adc_to_voltage)

    if GROUND_COL in df.columns:
        df["Ground_Voltage"] = df[GROUND_COL].apply(adc_to_voltage)

    return df


# ─────────────────────────────────────────────────────────────
# High-level RAW accessors
# ─────────────────────────────────────────────────────────────
def get_co2_all_raw(
    limit: Optional[int] = None,
    interval: Optional[Literal["raw", "1min", "5min", "15min", "30min", "1hour"]] = "raw",
) -> List[Dict]:
    df = read_all_csv_under(WISE4051_ROOT)

    if interval != "raw":
        df = aggregate_data(df, interval)

    if limit:
        df = df.tail(limit)

    return df_to_records(df)


def get_elec_all_raw(
    limit: Optional[int] = None,
    interval: Optional[Literal["raw", "1min", "5min", "15min", "30min", "1hour"]] = "raw",
) -> List[Dict]:
    df = read_all_csv_under(WISE4012_ROOT)

    # แปลง bioelectric เป็นโวลต์ก่อน
    df = convert_bioelectric_voltage(df)

    if interval != "raw":
        df = aggregate_data(df, interval)

    if limit:
        df = df.tail(limit)

    return df_to_records(df)


# ─────────────────────────────────────────────────────────────
# REALTIME SENSOR CACHE (for AI + Backend)
# ─────────────────────────────────────────────────────────────
def refresh_sensor_cache(
    limit: Optional[int] = 1000,
    interval: Optional[Literal["raw", "1min", "5min", "15min", "30min", "1hour"]] = "5min",
) -> None:
    """
    ดึงข้อมูลจาก Dropbox + aggregate + ใส่ลง sensor cache:
      - wise4051: CO2 / Temp / Humid
      - wise4012: Leaf / Ground (+ Leaf_Voltage / Ground_Voltage)
    """
    global _sensor_cache

    print("🔁 Refreshing ALL sensors...")

    # ---------- 4051 ----------
    df4051 = read_all_csv_under(WISE4051_ROOT, use_cache=False)

    if not df4051.empty and interval != "raw":
        df4051 = aggregate_data(df4051, interval)

    if not df4051.empty and limit:
        df4051 = df4051.tail(limit)

    if df4051.empty:
        print("⚠️ No WISE-4051 data found.")
        _sensor_cache["wise4051"] = {"data": None, "last_updated": None}
    else:
        _sensor_cache["wise4051"] = {
            "data": df4051.copy(),
            "last_updated": datetime.now(),
        }
        print(f"✅ 4051 cached: {len(df4051)} rows")

    # ---------- 4012 ----------
    df4012 = read_all_csv_under(WISE4012_ROOT, use_cache=False)

    # แปลง bioelectric เป็นโวลต์
    df4012 = convert_bioelectric_voltage(df4012)

    if not df4012.empty and interval != "raw":
        df4012 = aggregate_data(df4012, interval)

    if not df4012.empty and limit:
        df4012 = df4012.tail(limit)

    if df4012.empty:
        print("⚠️ No WISE-4012 data found.")
        _sensor_cache["wise4012"] = {"data": None, "last_updated": None}
    else:
        _sensor_cache["wise4012"] = {
            "data": df4012.copy(),
            "last_updated": datetime.now(),
        }
        print(f"✅ 4012 cached: {len(df4012)} rows")


def get_sensor_cache():
    return _sensor_cache


# ─────────────────────────────────────────────────────────────
# CLEAR CACHE
# ─────────────────────────────────────────────────────────────
def clear_cache():
    global _cache, _sensor_cache
    _cache = {}
    _sensor_cache = {
        "wise4051": {"data": None, "last_updated": None},
        "wise4012": {"data": None, "last_updated": None},
    }
    print("🧹 All cache cleared.")