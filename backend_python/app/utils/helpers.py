from datetime import datetime, date
from calendar import monthrange


def calculate_pro_rata_fee(join_date, monthly_price: float, target_month: str) -> float:
    """
    O'quvchi kelgan sanasiga qarab shu oy uchun to'lov miqdorini hisoblaydi.
    :param join_date: O'quvchi kelgan sana (datetime yoki string)
    :param monthly_price: Bir oylik to'lov miqdori
    :param target_month: Hisoblanayotgan oy (YYYY-MM formatida)
    :return: Hisoblangan to'lov miqdori
    """
    if not join_date or not monthly_price:
        return monthly_price or 0

    if isinstance(join_date, str):
        join_date = datetime.fromisoformat(join_date.replace("Z", "+00:00"))

    join_year = join_date.year
    join_month = join_date.month
    join_day = join_date.day

    target_year, target_month_num = map(int, target_month.split('-'))

    # Agar o'quvchi kelajakda keladigan bo'lsa
    if join_year > target_year or (join_year == target_year and join_month > target_month_num):
        return 0

    # Agar o'quvchi o'tgan oylarda kelgan bo'lsa, to'liq to'lov
    if join_year < target_year or (join_year == target_year and join_month < target_month_num):
        return monthly_price

    # Agar o'quvchi aynan shu oyda kelgan bo'lsa
    if join_year == target_year and join_month == target_month_num:
        days_in_month = monthrange(target_year, target_month_num)[1]
        remaining_days = days_in_month - join_day + 1
        fee_per_day = monthly_price / days_in_month
        return round(fee_per_day * remaining_days)

    return monthly_price


def serialize_doc(doc: dict) -> dict:
    """MongoDB hujjatini JSON-serializable formatga o'tkazadi."""
    if not doc:
        return doc
    from bson import ObjectId
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [serialize_doc(v) if isinstance(v, dict) else (str(v) if isinstance(v, ObjectId) else v) for v in value]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result
