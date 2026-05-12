from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime
from bson import ObjectId
from ..database import get_database
from ..middleware.auth import get_current_user, admin_only
from ..utils.helpers import serialize_doc

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("")
async def get_attendance(
    course: Optional[str] = None,
    date: Optional[str] = None,
    student: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    query = {}
    if current_user.get("academy"):
        query["academy"] = ObjectId(current_user["academy"])

    if course:
        query["course"] = ObjectId(course)
    if student:
        query["student"] = ObjectId(student)
    if date:
        start = datetime.fromisoformat(date)
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start.replace(hour=23, minute=59, second=59, microsecond=999999)
        query["date"] = {"$gte": start, "$lte": end}
    elif startDate and endDate:
        query["date"] = {
            "$gte": datetime.fromisoformat(startDate.replace("Z", "")),
            "$lte": datetime.fromisoformat(endDate.replace("Z", ""))
        }

    pipeline = [
        {"$match": query},
        {"$lookup": {"from": "students", "localField": "student", "foreignField": "_id", "as": "student"}},
        {"$unwind": {"path": "$student", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "courses", "localField": "course", "foreignField": "_id", "as": "course"}},
        {"$unwind": {"path": "$course", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "users", "localField": "markedBy", "foreignField": "_id", "as": "markedBy"}},
        {"$unwind": {"path": "$markedBy", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"date": -1}}
    ]
    records = await db.attendance.aggregate(pipeline).to_list(None)
    return {"success": True, "data": [serialize_doc(r) for r in records]}


@router.post("/bulk")
async def mark_bulk_attendance(body: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()
    records = body.get("records", [])
    if not records:
        raise HTTPException(status_code=400, detail="Records bo'sh")

    ops = []
    for r in records:
        day = datetime.fromisoformat(r["date"].replace("Z", "")).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        ops.append({
            "updateOne": {
                "filter": {
                    "student": ObjectId(r["student"]),
                    "course": ObjectId(r["course"]),
                    "academy": ObjectId(current_user.get("academy")),
                    "date": day,
                },
                "update": {
                    "$set": {
                        "status": r.get("status", "present"),
                        "note": r.get("note", ""),
                        "markedBy": ObjectId(current_user["_id"]),
                        "academy": ObjectId(current_user.get("academy")),
                    }
                },
                "upsert": True
            }
        })

    await db.attendance.bulk_write(ops)
    return {"success": True, "message": "Davomat saqlandi"}


@router.get("/stats/{student_id}")
async def get_student_attendance_stats(student_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    match = {
        "student": ObjectId(student_id),
    }
    if current_user.get("academy"):
        match["academy"] = ObjectId(current_user["academy"])

    stats = await db.attendance.aggregate([
        {"$match": match},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(None)

    result = {"present": 0, "absent": 0, "late": 0, "excused": 0}
    for s in stats:
        result[s["_id"]] = s["count"]
    total = sum(result.values())
    result["total"] = total
    result["percentage"] = round((result["present"] / total) * 100) if total > 0 else 0
    return {"success": True, "data": result}


@router.get("/absentees/today")
async def get_absentees(current_user: dict = Depends(get_current_user)):
    db = get_database()
    now = datetime.utcnow()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    query = {"date": {"$gte": start, "$lte": end}, "status": "absent"}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    pipeline = [
        {"$match": query},
        {"$lookup": {"from": "students", "localField": "student", "foreignField": "_id", "as": "student"}},
        {"$unwind": {"path": "$student", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "courses", "localField": "course", "foreignField": "_id", "as": "course"}},
        {"$unwind": {"path": "$course", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"createdAt": -1}}
    ]
    absentees = await db.attendance.aggregate(pipeline).to_list(None)
    return {"success": True, "data": [serialize_doc(a) for a in absentees]}


@router.patch("/note/{attendance_id}")
async def update_attendance_note(attendance_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {"_id": ObjectId(attendance_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    result = await db.attendance.find_one_and_update(
        query, {"$set": {"note": body.get("note", "")}}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Davomat topilmadi")
    return {"success": True, "data": serialize_doc(result)}


@router.delete("/delete/{attendance_id}")
async def delete_attendance(attendance_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {"_id": ObjectId(attendance_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    result = await db.attendance.find_one_and_delete(query)
    if not result:
        raise HTTPException(status_code=404, detail="Davomat topilmadi")
    return {"success": True, "message": "Davomat o'chirildi"}
