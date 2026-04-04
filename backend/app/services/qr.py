import io

import qrcode
import boto3

from app.core.config import settings


async def generate_qr_code(token: str) -> str:
    """Generate a QR code PNG for a ticket token and upload to S3/R2."""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(token)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    key = f"qr-codes/{token}.png"

    if settings.S3_BUCKET_NAME:
        s3 = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL or None,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        )
        s3.upload_fileobj(
            buffer,
            settings.S3_BUCKET_NAME,
            key,
            ExtraArgs={"ContentType": "image/png"},
        )
        return f"{settings.S3_PUBLIC_URL}/{key}"

    # Fallback: save locally for development
    local_path = f"/tmp/{token}.png"
    with open(local_path, "wb") as f:
        f.write(buffer.getvalue())
    return local_path
