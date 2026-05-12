from .auth import router as auth_router
from .students import router as students_router
from .courses import router as courses_router
from .teachers import router as teachers_router
from .payments import router as payments_router
from .attendance import router as attendance_router
from .grades import router as grades_router
from .salaries import router as salaries_router
from .expenses import router as expenses_router
from .academies import router as academies_router
from .dashboard import router as dashboard_router

__all__ = [
    "auth_router", "students_router", "courses_router",
    "teachers_router", "payments_router", "attendance_router",
    "grades_router", "salaries_router", "expenses_router",
    "academies_router", "dashboard_router"
]
