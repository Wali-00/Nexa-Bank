from pydantic import BaseModel
from datetime import date


class EmployeeCreate(BaseModel):

    first_name: str
    last_name: str

    username: str
    email: str
    password: str

    role: str

    branch_id: int
    department_id: int
    position_id: int

    nid: str
    phone: str

    joining_date: date
    salary: float

    status: str = "ACTIVE"

