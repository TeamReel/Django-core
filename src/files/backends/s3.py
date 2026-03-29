"""
AWS S3 Storage Backend for TeamReel.

This module provides AWS S3 integration for file uploads,
downloads, and presigned URL generation.
"""

from io import BytesIO
from typing import IO

from django.conf import settings

from .base import StorageBackend


class S3StorageBackend(StorageBackend):
    """
    AWS S3 Storage backend implementation.

    Required settings:
        AWS_ACCESS_KEY_ID: AWS access key
        AWS_SECRET_ACCESS_KEY: AWS secret key
        AWS_S3_BUCKET_NAME: S3 bucket name
        AWS_S3_REGION: AWS region (e.g., 'eu-north-1')

    Optional settings:
        AWS_S3_CUSTOM_DOMAIN: Custom domain for CDN (optional)
    """

    def __init__(self):
        try:
            import boto3
            from botocore.config import Config
        except ImportError:
            raise ImportError(
                "boto3 is required for AWS S3 Storage. " "Install it with: pip install boto3"
            ) from None

        self.access_key = getattr(settings, "AWS_ACCESS_KEY_ID", None)
        self.secret_key = getattr(settings, "AWS_SECRET_ACCESS_KEY", None)
        self.bucket_name = getattr(settings, "AWS_S3_BUCKET_NAME", "teamreel-assets-demo")
        self.region = getattr(settings, "AWS_S3_REGION", "eu-north-1")
        self.custom_domain = getattr(settings, "AWS_S3_CUSTOM_DOMAIN", None)

        if not self.access_key or not self.secret_key:
            raise ValueError(
                "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY " "must be set in Django settings"
            )

        # Create S3 client
        self._client = boto3.client(
            "s3",
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
            config=Config(signature_version="s3v4"),
        )

        # Store boto3 for later use
        self._boto3 = boto3

    def save(self, path: str, file_obj: IO) -> str:
        """
        Save file to S3.

        Tries to set public-read ACL for direct URL access. Falls back to
        private if bucket has Block Public Access enabled (presigned URLs
        will still work via get_url).

        Args:
            path: The object key (e.g., 'logos/clubs/180.png')
            file_obj: File-like object to upload

        Returns:
            The object key
        """
        content = file_obj.read()
        content_type = self._guess_content_type(path)

        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        try:
            self._client.put_object(
                Bucket=self.bucket_name,
                Key=path,
                Body=content,
                ACL="public-read",
                **extra_args,
            )
        except Exception as e:
            # Bucket may block public ACLs — upload without ACL
            import logging
            logging.getLogger(__name__).warning(
                "s3_acl_public_read_failed path=%s error=%s falling_back_to_private=True",
                path,
                str(e)[:200],
            )
            self._client.put_object(
                Bucket=self.bucket_name,
                Key=path,
                Body=content,
                **extra_args,
            )

        return path

    def save_from_bytes(self, path: str, data: bytes, content_type: str = None) -> str:
        """
        Save bytes directly to S3.

        Args:
            path: The object key
            data: Raw bytes to upload
            content_type: Optional content type

        Returns:
            The object key
        """
        if not content_type:
            content_type = self._guess_content_type(path)

        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        try:
            self._client.put_object(
                Bucket=self.bucket_name,
                Key=path,
                Body=data,
                ACL="public-read",
                **extra_args,
            )
        except Exception:
            # Bucket may block public ACLs — upload without ACL
            self._client.put_object(
                Bucket=self.bucket_name,
                Key=path,
                Body=data,
                **extra_args,
            )

        return path

    def url(self, path: str) -> str:
        """
        Return the public URL for an object.

        Args:
            path: The object key

        Returns:
            Public URL string
        """
        if self.custom_domain:
            return f"https://{self.custom_domain}/{path}"
        return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{path}"

    def open(self, path: str, mode: str = "rb") -> IO:
        """
        Open and return file content as BytesIO.

        Args:
            path: The object key
            mode: File mode (ignored, always binary)

        Returns:
            BytesIO object with file content
        """
        response = self._client.get_object(Bucket=self.bucket_name, Key=path)
        content = response["Body"].read()
        return BytesIO(content)

    def delete(self, path: str) -> bool:
        """
        Delete an object.

        Args:
            path: The object key

        Returns:
            True if deleted, False otherwise
        """
        try:
            self._client.delete_object(Bucket=self.bucket_name, Key=path)
            return True
        except Exception:
            return False

    def exists(self, path: str) -> bool:
        """
        Check if an object exists.

        Args:
            path: The object key

        Returns:
            True if exists, False otherwise
        """
        try:
            self._client.head_object(Bucket=self.bucket_name, Key=path)
            return True
        except Exception:
            return False

    def get_url(self, path: str, signed: bool = True, expiry_seconds: int = 3600) -> str:
        """
        Get public or presigned URL for an object.

        Args:
            path: The object key
            signed: If True, generate a presigned URL with limited validity
            expiry_seconds: Seconds until presigned URL expires (default: 1 hour)

        Returns:
            URL string (public or presigned)
        """
        if not signed:
            return self.url(path)

        # Generate presigned URL
        presigned_url = self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": path},
            ExpiresIn=expiry_seconds,
        )

        return presigned_url

    def list_objects(self, prefix: str = None) -> list[str]:
        """
        List all objects in bucket, optionally filtered by prefix.

        Args:
            prefix: Optional prefix to filter objects

        Returns:
            List of object keys
        """
        params = {"Bucket": self.bucket_name}
        if prefix:
            params["Prefix"] = prefix

        response = self._client.list_objects_v2(**params)
        return [obj["Key"] for obj in response.get("Contents", [])]

    def _guess_content_type(self, path: str) -> str | None:
        """Guess content type from file extension."""
        import mimetypes

        content_type, _ = mimetypes.guess_type(path)
        return content_type or "application/octet-stream"
