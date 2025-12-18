import logging
from urllib.parse import parse_qs

import jwt
from channels.db import database_sync_to_async
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)
User = get_user_model()


@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware:
    """
    Middleware to authenticate user via JWT token in query string.
    Extracts 'token' parameter from query string and validates it using SIMPLE_JWT settings.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Only handle websocket connections
        if scope["type"] != "websocket":
            return await self.app(scope, receive, send)

        # Check if user is already authenticated (e.g. by session)
        if scope.get("user") and scope["user"].is_authenticated:
            return await self.app(scope, receive, send)

        try:
            query_string = parse_qs(scope["query_string"].decode())
            token = query_string.get("token")

            if token:
                token = token[0]
                # Get settings from SIMPLE_JWT
                simple_jwt_settings = getattr(settings, "SIMPLE_JWT", {})
                key = simple_jwt_settings.get("SIGNING_KEY", settings.SECRET_KEY)
                algorithm = simple_jwt_settings.get("ALGORITHM", "HS256")

                # Decode token
                payload = jwt.decode(token, key, algorithms=[algorithm])
                user_id = payload.get("user_id")

                if user_id:
                    scope["user"] = await get_user(user_id)
                    logger.debug(f"Authenticated user {user_id} via JWT")
                else:
                    logger.warning("JWT token missing user_id claim")

        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
        except jwt.DecodeError:
            logger.warning("Invalid JWT token")
        except Exception as e:
            logger.error(f"JWT authentication error: {str(e)}")

        return await self.app(scope, receive, send)
