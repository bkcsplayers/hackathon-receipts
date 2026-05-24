# 08 — 邮件收据系统 (CloudCone IMAP)

> **执行者**: Claude Code  
> **邮件服务**: CloudCone 自建邮件, 4 个独立 IMAP 邮箱

---

## 1. 架构

```
4 个邮箱, 每个绑定一个用户:
admin-receipts@yourdomain.com     → Admin
membera-receipts@yourdomain.com   → Member A
memberb-receipts@yourdomain.com   → Member B
memberc-receipts@yourdomain.com   → Member C

后台 Worker 每 5 分钟扫描所有活跃邮箱
```

## 2. 邮件扫描 Worker

```python
# server/tasks/email_worker.py
import asyncio
import imapclient
import email
from email import policy
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from models.email_inbox import EmailInbox
from models.user import User
from services.upload_pipeline import process_receipt_upload
from models.base import async_session
import structlog

logger = structlog.get_logger()

async def scan_all_inboxes():
    """扫描所有活跃用户的邮箱"""
    async with async_session() as db:
        result = await db.execute(
            select(EmailInbox).where(EmailInbox.is_active == True)
        )
        inboxes = result.scalars().all()
        
        for inbox in inboxes:
            try:
                await scan_single_inbox(inbox, db)
            except Exception as e:
                logger.error("inbox_scan_failed", email=inbox.email_address, error=str(e))

async def scan_single_inbox(inbox: EmailInbox, db):
    """扫描单个邮箱"""
    logger.info("scanning_inbox", email=inbox.email_address)
    
    # 连接 IMAP
    client = imapclient.IMAPClient(inbox.imap_host, port=inbox.imap_port, ssl=True)
    client.login(inbox.imap_username, inbox.imap_password_encrypted)  # 注意: 需要解密
    client.select_folder('INBOX')
    
    # 搜索未读邮件
    messages = client.search(['UNSEEN'])
    logger.info("found_unseen", count=len(messages), email=inbox.email_address)
    
    for msg_id in messages:
        try:
            raw = client.fetch([msg_id], ['RFC822'])
            msg = email.message_from_bytes(raw[msg_id][b'RFC822'], policy=policy.default)
            
            await process_email_receipt(msg, inbox.user_id, db)
            
            # 标记为已读
            client.set_flags([msg_id], [imapclient.SEEN])
            
            # 更新统计
            inbox.total_processed += 1
            inbox.last_checked_at = datetime.utcnow()
            
        except Exception as e:
            logger.error("email_process_failed", msg_id=msg_id, error=str(e))
    
    client.logout()
    await db.commit()

async def process_email_receipt(msg, user_id, db):
    """处理邮件中的收据"""
    subject = msg.get('subject', '')
    sender = msg.get('from', '')
    
    # 提取附件 (图片)
    for part in msg.walk():
        content_type = part.get_content_type()
        
        if content_type in ['image/jpeg', 'image/png', 'image/webp', 'image/heic']:
            file_bytes = part.get_payload(decode=True)
            filename = part.get_filename() or f"email_receipt_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            
            # 走正常的上传管线
            receipt = await process_receipt_upload(
                file_bytes=file_bytes,
                filename=filename,
                user_id=user_id,
                gps_latitude=None,
                gps_longitude=None,
                db_session=db
            )
            receipt.source = "EMAIL"  # 标记来源
            logger.info("email_receipt_processed", receipt_id=str(receipt.id), from_email=sender)
            return
    
    # 没有图片附件 → 尝试从邮件正文提取 (电子收据)
    body = msg.get_body(preferencelist=('html', 'plain'))
    if body:
        body_text = body.get_content()
        # 可以将 HTML/text 直接交给 DeepSeek 提取
        logger.info("email_text_receipt", subject=subject, length=len(body_text))
        # TODO: 实现纯文本/HTML 电子收据解析

# === 启动调度器 ===
def start_email_worker():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(scan_all_inboxes, 'interval', minutes=5)
    scheduler.start()
    
    logger.info("email_worker_started", interval="5 minutes")
    
    # Keep running
    loop = asyncio.get_event_loop()
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        scheduler.shutdown()

if __name__ == "__main__":
    start_email_worker()
```

## 3. 邮箱密码安全

```python
# 使用 Fernet 加密存储密码
from cryptography.fernet import Fernet
from config import settings

fernet = Fernet(settings.EMAIL_ENCRYPTION_KEY)

def encrypt_password(plain: str) -> str:
    return fernet.encrypt(plain.encode()).decode()

def decrypt_password(encrypted: str) -> str:
    return fernet.decrypt(encrypted.encode()).decode()
```

## 4. Admin 创建用户时绑定邮箱

```python
# 在 api/users.py 的 create_user 中:
if data.receipt_email and data.receipt_email_password:
    email_inbox = EmailInbox(
        user_id=new_user.id,
        email_address=data.receipt_email,
        imap_host=settings.EMAIL_IMAP_HOST,  # CloudCone 统一
        imap_port=993,
        imap_username=data.receipt_email,
        imap_password_encrypted=encrypt_password(data.receipt_email_password),
        is_active=True
    )
    db.add(email_inbox)
```
