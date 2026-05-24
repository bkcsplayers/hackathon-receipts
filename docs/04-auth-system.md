# 04 — 认证系统 (JWT + RBAC)

> **执行者**: Claude Code  
> **关键**: 无注册入口! 只有 Admin 可以创建用户

---

## 1. JWT 配置

```python
# server/core/security.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
```

## 2. RBAC 权限矩阵

| 端点 | Admin | Member | Public |
|:-----|:-----:|:------:|:------:|
| POST /auth/login | ✅ | ✅ | ✅ |
| GET /users | ✅ | ❌ | ❌ |
| POST /users | ✅ | ❌ | ❌ |
| POST /upload | ✅ | ✅ | ❌ |
| GET /receipts | ✅ (all+own) | ✅ (own) | ❌ |
| GET /dashboard/* | ✅ (all+own) | ✅ (own) | ❌ |
| GET /dashboard/comparison | ✅ | ❌ | ❌ |
| GET /dashboard/members | ✅ | ❌ | ❌ |
| GET /map/* | ✅ (all+own) | ✅ (own) | ❌ |

## 3. 数据隔离中间件 (关键!)

```python
# server/core/deps.py

def get_user_filter(current_user: User, view: str = "personal"):
    """
    返回 SQLAlchemy WHERE 条件:
    - Member: 永远只看自己的
    - Admin + "personal": 看自己的
    - Admin + "family": 看所有人的
    """
    if current_user.role != "admin" or view == "personal":
        return Receipt.user_id == current_user.id
    else:
        return True  # 不过滤 (全员)
```

## 4. 用户创建流程 (Admin Only)

```python
# server/api/users.py
@router.post("/", dependencies=[Depends(require_admin)])
async def create_user(data: UserCreate, db = Depends(get_db)):
    # 1. 检查 username/email 唯一性
    # 2. Hash 密码
    # 3. 创建 User
    # 4. 创建 EmailInbox (绑定收据邮箱)
    # 5. 记录 AuditLog
    # 6. 返回用户信息 (不含密码)
```

## 5. Pydantic Schemas

```python
# server/schemas/auth.py
from pydantic import BaseModel

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

# server/schemas/user.py
class UserCreate(BaseModel):
    username: str
    display_name: str
    email: str
    password: str
    role: str = "member"
    receipt_email: str | None = None
    receipt_email_password: str | None = None

class UserUpdate(BaseModel):
    display_name: str | None = None
    email: str | None = None
    password: str | None = None
    is_active: bool | None = None
    receipt_email: str | None = None
```
