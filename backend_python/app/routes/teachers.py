from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId
from ..database import get_database
from ..middleware.auth import get_current_user, admin_only
from ..utils.auth import get_password_hash
from ..utils.helpers import serialize_doc

router = APIRouter(prefix="/teachers", tags=["teachers"])


@router.get("")
async def get_teachers(current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    # N+1 muammosini yechish: bitta pipeline
    pipeline = [
        {"$match": query},
        {"$lookup": {
            "from": "courses",
            "let": {"tid": "$_id"},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$teacher", "$$tid"]}}},
                {"$project": {"title": 1, "isActive": 1, "price": 1}}
            ],
            "as": "courses"
        }},
        {"$sort": {"createdAt": -1}}
    ]
    teachers = await db.teachers.aggregate(pipeline).to_list(None)
    return {"success": True, "data": [serialize_doc(t) for t in teachers]}


@router.get("/{teacher_id}")
async def get_teacher(teacher_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {"_id": ObjectId(teacher_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    teacher = await db.teachers.find_one(query)
    if not teacher:
        raise HTTPException(status_code=404, detail="O'qituvchi topilmadi")

    courses = await db.courses.find({"teacher": ObjectId(teacher_id)}).to_list(None)
    teacher = serialize_doc(teacher)
    teacher["courses"] = [serialize_doc(c) for c in courses]
    return {"success": True, "data": teacher}


@router.post("", status_code=201)
async def create_teacher(body: dict, current_user: dict = Depends(admin_only)):
    db = get_database()
    name = body.get("name")
    phone = body.get("phone")
    password = body.get("password")
    subject = body.get("subject")

    if not phone or not password:
        raise HTTPException(status_code=400, detail="Telefon raqam va parol kiritilishi shart")

    user_exists = await db.users.find_one({"phone": phone})
    if user_exists:
        raise HTTPException(status_code=400, detail="Ushbu telefon raqam bilan foydalanuvchi allaqachon mavjud")

    user_data = {
        "name": name,
        "phone": phone,
        "password": get_password_hash(password),
        "role": "teacher",
        "academy": ObjectId(current_user.get("academy")),
        "isActive": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    user_result = await db.users.insert_one(user_data)

    teacher_data = {
        "name": name,
        "phone": phone,
        "subject": subject,
        "user": user_result.inserted_id,
        "academy": ObjectId(current_user.get("academy")),
        "salary": 0,
        "salaryPaid": 0,
        "isActive": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    teacher_result = await db.teachers.insert_one(teacher_data)
    teacher = await db.teachers.find_one({"_id": teacher_result.inserted_id})
    return {"success": True, "data": serialize_doc(teacher)}


@router.put("/{teacher_id}")
async def update_teacher(teacher_id: str, body: dict, current_user: dict = Depends(admin_only)):
    db = get_database()
    query = {"_id": ObjectId(teacher_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    update_data = body.copy()
    update_data["updatedAt"] = datetime.utcnow()

    result = await db.teachers.find_one_and_update(query, {"$set": update_data}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail="O'qituvchi topilmadi")
    return {"success": True, "data": serialize_doc(result)}


@router.delete("/{teacher_id}")
async def delete_teacher(teacher_id: str, current_user: dict = Depends(admin_only)):
    db = get_database()
    query = {"_id": ObjectId(teacher_id)}
    if current_user["role"] != "superadmin":
        query["academy"] = ObjectId(current_user.get("academy"))

    teacher = await db.teachers.find_one(query)
    if not teacher:
        raise HTTPException(status_code=404, detail="O'qituvchi topilmadi")

    course_count = await db.courses.count_documents({"teacher": ObjectId(teacher_id)})
    if course_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Bu o'qituvchining kurslari mavjud. Avval kurslarni boshqa ustozga biriktiring yoki o'chiring."
        )

    if teacher.get("user"):
        await db.users.delete_one({"_id": teacher["user"]})

    await db.teachers.delete_one({"_id": ObjectId(teacher_id)})
    return {"success": True, "message": "O'qituvchi va uning akkaunti o'chirildi"}
