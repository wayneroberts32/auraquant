"""
AuraQuant Authentication System
JWT-based authentication with role-based access control and API key management
"""

import jwt
import bcrypt
import secrets
import pyotp
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from sqlalchemy.orm import Session
import logging
import redis.asyncio as redis
from dataclasses import dataclass
import json

from ..models.database import User, UserSession, UserRole, AuditLog

logger = logging.getLogger(__name__)

# Security configurations
SECRET_KEY = secrets.token_urlsafe(32)  # In production, load from environment
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
API_KEY_LENGTH = 64
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30

security = HTTPBearer()
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

@dataclass
class TokenData:
    """Token payload data"""
    user_id: str
    email: str
    role: UserRole
    session_id: str
    exp: datetime

class AuthenticationManager:
    """
    Comprehensive authentication manager for AuraQuant
    """
    
    def __init__(self, db_session: Session, redis_client: redis.Redis = None):
        self.db = db_session
        self.redis = redis_client
        self.pepper = secrets.token_urlsafe(16)  # Additional salt for passwords
        
    # Password Management
    
    def hash_password(self, password: str) -> str:
        """Hash password with bcrypt and pepper"""
        peppered = password + self.pepper
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(peppered.encode('utf-8'), salt).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        peppered = password + self.pepper
        return bcrypt.checkpw(peppered.encode('utf-8'), hashed.encode('utf-8'))
    
    # User Registration and Login
    
    async def register_user(self, email: str, username: str, password: str, 
                           full_name: str = None, country: str = "AU") -> User:
        """Register a new user with proper validation"""
        
        # Check if user exists
        existing_user = self.db.query(User).filter(
            (User.email == email) | (User.username == username)
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email or username already exists"
            )
        
        # Validate password strength
        if not self._validate_password_strength(password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password does not meet security requirements"
            )
        
        # Create user
        user = User(
            email=email,
            username=username,
            password_hash=self.hash_password(password),
            full_name=full_name,
            country=country,
            role=UserRole.VIEWER,  # Default role
            created_at=datetime.utcnow()
        )
        
        # Generate API credentials
        user.api_key = secrets.token_urlsafe(API_KEY_LENGTH)
        user.api_secret_hash = self.hash_password(secrets.token_urlsafe(32))
        
        self.db.add(user)
        self.db.commit()
        
        # Log registration
        await self._audit_log(user.id, "register", "user", user.id, success=True)
        
        logger.info(f"User registered: {email}")
        
        return user
    
    async def login(self, email: str, password: str, ip_address: str = None,
                   user_agent: str = None, two_factor_code: str = None) -> Dict[str, str]:
        """Authenticate user and return tokens"""
        
        # Find user
        user = self.db.query(User).filter(User.email == email).first()
        
        if not user:
            await self._audit_log(None, "login_failed", "user", None, 
                                success=False, error="User not found")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Check if account is locked
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account locked until {user.locked_until}"
            )
        
        # Verify password
        if not self.verify_password(password, user.password_hash):
            user.failed_login_attempts += 1
            
            # Lock account after max attempts
            if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
                user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                self.db.commit()
                
                await self._audit_log(user.id, "account_locked", "user", user.id,
                                    success=True, error="Max login attempts exceeded")
                
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="Account locked due to multiple failed login attempts"
                )
            
            self.db.commit()
            
            await self._audit_log(user.id, "login_failed", "user", user.id,
                                success=False, error="Invalid password")
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Check 2FA if enabled
        if user.two_factor_enabled:
            if not two_factor_code:
                raise HTTPException(
                    status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                    detail="Two-factor authentication code required"
                )
            
            if not self._verify_2fa_code(user.two_factor_secret, two_factor_code):
                await self._audit_log(user.id, "login_failed", "user", user.id,
                                    success=False, error="Invalid 2FA code")
                
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid two-factor authentication code"
                )
        
        # Check compliance requirements
        if not await self._check_login_compliance(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account does not meet compliance requirements"
            )
        
        # Reset failed attempts on successful login
        user.failed_login_attempts = 0
        user.last_login = datetime.utcnow()
        
        # Create session
        session = UserSession(
            user_id=user.id,
            token=secrets.token_urlsafe(32),
            refresh_token=secrets.token_urlsafe(32),
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            refresh_expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            created_at=datetime.utcnow()
        )
        
        self.db.add(session)
        self.db.commit()
        
        # Generate JWT tokens
        access_token = self._create_access_token(user, session.id)
        refresh_token = self._create_refresh_token(user, session.id)
        
        # Cache session in Redis for fast lookup
        if self.redis:
            await self._cache_session(session, user)
        
        # Audit log
        await self._audit_log(user.id, "login", "user", user.id, 
                            success=True, ip_address=ip_address)
        
        logger.info(f"User logged in: {email}")
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "role": user.role.value
        }
    
    # Token Management
    
    def _create_access_token(self, user: User, session_id: str) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        payload = {
            "sub": user.id,
            "email": user.email,
            "role": user.role.value,
            "session_id": session_id,
            "exp": expire,
            "iat": datetime.utcnow()
        }
        
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    def _create_refresh_token(self, user: User, session_id: str) -> str:
        """Create JWT refresh token"""
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        payload = {
            "sub": user.id,
            "session_id": session_id,
            "type": "refresh",
            "exp": expire,
            "iat": datetime.utcnow()
        }
        
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    async def verify_token(self, token: str) -> TokenData:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            # Check if session is valid
            session_id = payload.get("session_id")
            
            if self.redis:
                # Check Redis cache first
                cached = await self.redis.get(f"session:{session_id}")
                if not cached:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Session expired or invalid"
                    )
            else:
                # Check database
                session = self.db.query(UserSession).filter(
                    UserSession.id == session_id,
                    UserSession.expires_at > datetime.utcnow()
                ).first()
                
                if not session:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Session expired or invalid"
                    )
            
            return TokenData(
                user_id=payload["sub"],
                email=payload["email"],
                role=UserRole(payload["role"]),
                session_id=session_id,
                exp=datetime.fromtimestamp(payload["exp"])
            )
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """Generate new access token from refresh token"""
        try:
            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            
            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            
            # Get user and session
            user = self.db.query(User).filter(User.id == payload["sub"]).first()
            session = self.db.query(UserSession).filter(
                UserSession.id == payload["session_id"],
                UserSession.refresh_expires_at > datetime.utcnow()
            ).first()
            
            if not user or not session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )
            
            # Create new access token
            new_access_token = self._create_access_token(user, session.id)
            
            # Update session expiry
            session.expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            session.last_activity = datetime.utcnow()
            self.db.commit()
            
            # Update cache
            if self.redis:
                await self._cache_session(session, user)
            
            return {
                "access_token": new_access_token,
                "token_type": "bearer",
                "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
            }
            
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
    
    # API Key Management
    
    async def verify_api_key(self, api_key: str) -> User:
        """Verify API key and return user"""
        
        # Check cache first
        if self.redis:
            cached = await self.redis.get(f"api_key:{api_key}")
            if cached:
                user_data = json.loads(cached)
                return self.db.query(User).filter(User.id == user_data["user_id"]).first()
        
        # Check database
        user = self.db.query(User).filter(
            User.api_key == api_key,
            User.is_active == True
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
        
        # Cache for future requests
        if self.redis:
            await self.redis.setex(
                f"api_key:{api_key}",
                300,  # 5 minutes
                json.dumps({"user_id": user.id})
            )
        
        return user
    
    async def regenerate_api_key(self, user_id: str) -> str:
        """Generate new API key for user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Generate new API key
        old_key = user.api_key
        user.api_key = secrets.token_urlsafe(API_KEY_LENGTH)
        self.db.commit()
        
        # Invalidate old key in cache
        if self.redis and old_key:
            await self.redis.delete(f"api_key:{old_key}")
        
        # Audit log
        await self._audit_log(user_id, "api_key_regenerated", "user", user_id, success=True)
        
        logger.info(f"API key regenerated for user: {user_id}")
        
        return user.api_key
    
    # Two-Factor Authentication
    
    async def enable_2fa(self, user_id: str) -> Dict[str, str]:
        """Enable 2FA for user and return QR code data"""
        user = self.db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Generate secret
        secret = pyotp.random_base32()
        user.two_factor_secret = secret
        user.two_factor_enabled = False  # Will be enabled after verification
        self.db.commit()
        
        # Generate provisioning URI for QR code
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name="AuraQuant"
        )
        
        return {
            "secret": secret,
            "qr_code": provisioning_uri
        }
    
    async def verify_2fa(self, user_id: str, code: str) -> bool:
        """Verify 2FA code and enable if correct"""
        user = self.db.query(User).filter(User.id == user_id).first()
        
        if not user or not user.two_factor_secret:
            return False
        
        if self._verify_2fa_code(user.two_factor_secret, code):
            user.two_factor_enabled = True
            self.db.commit()
            
            await self._audit_log(user_id, "2fa_enabled", "user", user_id, success=True)
            
            return True
        
        return False
    
    def _verify_2fa_code(self, secret: str, code: str) -> bool:
        """Verify TOTP code"""
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)  # Allow 30 second window
    
    # Role-Based Access Control
    
    def check_permission(self, user_role: UserRole, required_role: UserRole) -> bool:
        """Check if user has required role permission"""
        role_hierarchy = {
            UserRole.VIEWER: 0,
            UserRole.TRADER: 1,
            UserRole.API: 2,
            UserRole.ADMIN: 3
        }
        
        return role_hierarchy.get(user_role, 0) >= role_hierarchy.get(required_role, 0)
    
    async def require_role(self, token_data: TokenData, required_role: UserRole):
        """Dependency to require specific role"""
        if not self.check_permission(token_data.role, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role.value}"
            )
    
    # Session Management
    
    async def logout(self, user_id: str, session_id: str):
        """Logout user and invalidate session"""
        
        # Delete session from database
        session = self.db.query(UserSession).filter(
            UserSession.id == session_id,
            UserSession.user_id == user_id
        ).first()
        
        if session:
            self.db.delete(session)
            self.db.commit()
        
        # Remove from cache
        if self.redis:
            await self.redis.delete(f"session:{session_id}")
        
        # Audit log
        await self._audit_log(user_id, "logout", "user", user_id, success=True)
        
        logger.info(f"User logged out: {user_id}")
    
    async def logout_all_sessions(self, user_id: str):
        """Logout user from all sessions"""
        
        # Get all sessions
        sessions = self.db.query(UserSession).filter(
            UserSession.user_id == user_id
        ).all()
        
        # Delete from cache
        if self.redis:
            for session in sessions:
                await self.redis.delete(f"session:{session.id}")
        
        # Delete from database
        self.db.query(UserSession).filter(
            UserSession.user_id == user_id
        ).delete()
        self.db.commit()
        
        # Audit log
        await self._audit_log(user_id, "logout_all", "user", user_id, success=True)
        
        logger.info(f"All sessions terminated for user: {user_id}")
    
    # Compliance and Validation
    
    async def _check_login_compliance(self, user: User) -> bool:
        """Check if user meets compliance requirements for login"""
        
        # Check KYC status for trading
        if user.role in [UserRole.TRADER, UserRole.ADMIN]:
            if not user.kyc_verified:
                logger.warning(f"Login blocked - KYC not verified for user: {user.id}")
                return False
        
        # Check W-8BEN expiry for US trading
        if user.w8ben_expiry and user.w8ben_expiry < datetime.utcnow():
            logger.warning(f"Login blocked - W-8BEN expired for user: {user.id}")
            return False
        
        return True
    
    def _validate_password_strength(self, password: str) -> bool:
        """Validate password meets security requirements"""
        
        # Minimum 8 characters
        if len(password) < 8:
            return False
        
        # Must contain uppercase, lowercase, number, and special character
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
        
        return all([has_upper, has_lower, has_digit, has_special])
    
    # Helper Methods
    
    async def _cache_session(self, session: UserSession, user: User):
        """Cache session in Redis"""
        if not self.redis:
            return
        
        session_data = {
            "user_id": user.id,
            "email": user.email,
            "role": user.role.value,
            "session_id": session.id,
            "expires_at": session.expires_at.isoformat()
        }
        
        ttl = int((session.expires_at - datetime.utcnow()).total_seconds())
        
        await self.redis.setex(
            f"session:{session.id}",
            ttl,
            json.dumps(session_data)
        )
    
    async def _audit_log(self, user_id: Optional[str], action: str, 
                        entity_type: str, entity_id: str,
                        success: bool = True, error: Optional[str] = None,
                        ip_address: Optional[str] = None):
        """Create audit log entry"""
        
        audit = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            success=success,
            error_message=error,
            ip_address=ip_address,
            timestamp=datetime.utcnow()
        )
        
        self.db.add(audit)
        self.db.commit()

# FastAPI Dependencies

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security),
                          db: Session = Depends()) -> TokenData:
    """Get current user from JWT token"""
    
    auth_manager = AuthenticationManager(db)
    token_data = await auth_manager.verify_token(credentials.credentials)
    
    return token_data

async def get_api_user(api_key: str = Security(api_key_header),
                       db: Session = Depends()) -> User:
    """Get user from API key"""
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )
    
    auth_manager = AuthenticationManager(db)
    user = await auth_manager.verify_api_key(api_key)
    
    return user

def require_role(role: UserRole):
    """Decorator to require specific role"""
    
    async def role_checker(token_data: TokenData = Depends(get_current_user)):
        auth_manager = AuthenticationManager(None)
        
        if not auth_manager.check_permission(token_data.role, role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {role.value}"
            )
        
        return token_data
    
    return role_checker
