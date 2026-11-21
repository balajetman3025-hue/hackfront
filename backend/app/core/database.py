import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text, event
from sqlalchemy.pool import NullPool
from app.config import settings
from app.core.db_url import mask_database_url

logger = logging.getLogger(__name__)

Base = declarative_base()

def configure_sqlite_engine(engine):
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()
    return engine

# Determine active database URL (PostgreSQL by default, auto-fallback to SQLite if requested or on failure)
_active_async_url = settings.DATABASE_URL
_active_sync_url = settings.SYNC_DATABASE_URL
_using_fallback = False

def create_engine_for_url(url: str):
    if "sqlite" in url.lower():
        return configure_sqlite_engine(create_async_engine(
            url,
            echo=False,
            future=True,
            connect_args={"timeout": 30.0}
        ))
    pool_kwargs = {"poolclass": NullPool} if "-pooler" in url.lower() else {
        "pool_size": 5,
        "max_overflow": 5,
        "pool_recycle": 300,
        "pool_pre_ping": True,
        "pool_timeout": 30.0
    }
    return create_async_engine(
        url,
        echo=False,
        future=True,
        **pool_kwargs
    )

def get_engine():
    global _active_async_url, _active_sync_url, _using_fallback
    if settings.DATABASE_MODE == "sqlite_only":
        logger.info(f"Using explicitly configured SQLite database: {mask_database_url(settings.SQLITE_DATABASE_URL)}")
        _active_async_url = settings.SQLITE_DATABASE_URL
        _active_sync_url = settings.SQLITE_SYNC_DATABASE_URL
        _using_fallback = True
        return create_engine_for_url(_active_async_url)

    return create_engine_for_url(_active_async_url)

async_engine = get_engine()
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def switch_to_sqlite():
    """Switches active database engine to SQLite and runs schema creation."""
    global _active_async_url, _active_sync_url, _using_fallback, async_engine, AsyncSessionLocal
    logger.warning("Switching active database engine to SQLite fallback...")
    _active_async_url = settings.SQLITE_DATABASE_URL
    _active_sync_url = settings.SQLITE_SYNC_DATABASE_URL
    _using_fallback = True
    async_engine = create_engine_for_url(_active_async_url)
    AsyncSessionLocal.configure(bind=async_engine)
    
    # Initialize SQLite schema
    import app.models.relational  # noqa: F401
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("SQLite schema initialized successfully.")

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    global _active_async_url, _using_fallback, AsyncSessionLocal
    try:
        async with AsyncSessionLocal() as session:
            yield session
    except Exception as e:
        # Check if error is due to database connection refusal/failure
        err_str = str(e).lower()
        if (
            settings.SQLITE_FALLBACK_ENABLED
            and not _using_fallback
            and settings.DATABASE_MODE != "postgres_required"
            and any(k in err_str for k in ["connection refused", "111", "cannot connect", "could not connect", "connection error"])
        ):
            logger.warning(f"Database connection error in get_db ({e}). Executing automatic SQLite fallback...")
            await switch_to_sqlite()
            async with AsyncSessionLocal() as session:
                yield session
        else:
            raise

async def check_db_health() -> dict:
    global _active_async_url, _using_fallback
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            val = result.scalar()
            return {
                "status": "connected" if not _using_fallback else "connected_fallback",
                "database_type": "sqlite" if "sqlite" in _active_async_url else "postgresql",
                "is_fallback": _using_fallback,
                "ping": val == 1
            }
    except Exception as e:
        fallback_allowed = (
            settings.SQLITE_FALLBACK_ENABLED 
            and not _using_fallback 
            and settings.DATABASE_MODE != "postgres_required" 
            and settings.ENVIRONMENT != "production"
        )
        if fallback_allowed:
            try:
                logger.warning(f"PostgreSQL connection test failed ({e}). Switching to SQLite fallback...")
                await switch_to_sqlite()
                return {
                    "status": "connected_fallback",
                    "database_type": "sqlite",
                    "is_fallback": True,
                    "note": f"Primary PostgreSQL connection failed ({str(e)}). Switched to SQLite fallback."
                }
            except Exception as fe:
                return {
                    "status": "error",
                    "error": str(fe)
                }
        return {
            "status": "error",
            "database_type": "postgresql" if "postgresql" in _active_async_url else "sqlite",
            "error": str(e),
            "fallback_blocked": settings.DATABASE_MODE == "postgres_required" or settings.ENVIRONMENT == "production"
        }

async def init_db():
    """Initializes tables on startup. Verifies PostgreSQL connectivity and switches to SQLite if unreachable."""
    global _active_async_url, _using_fallback
    import app.models.relational  # noqa: F401

    if not _using_fallback and "sqlite" not in _active_async_url.lower():
        try:
            logger.info(f"Testing primary database connectivity ({mask_database_url(_active_async_url)})...")
            async with async_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Primary database schema verified and initialized.")
            return
        except Exception as e:
            if settings.SQLITE_FALLBACK_ENABLED and settings.DATABASE_MODE != "postgres_required":
                logger.warning(f"Primary PostgreSQL unreachable on startup ({e}). Automatically activating SQLite fallback.")
                await switch_to_sqlite()
                return
            else:
                logger.error(f"Primary database connection failed: {e}")
                raise

    # SQLite direct initialization
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schema initialized.")
