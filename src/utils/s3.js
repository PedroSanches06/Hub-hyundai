import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

export async function getUploadPresign(key, contentType, ttlSeconds = 300) {
  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: "private",
    ServerSideEncryption: "aws:kms" // requires KMS permissions; adjust if needed
  });
  return getSignedUrl(s3, cmd, { expiresIn: ttlSeconds });
}

export async function getDownloadPresign(key, ttlSeconds = 300) {
  const cmd = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key
  });
  return getSignedUrl(s3, cmd, { expiresIn: ttlSeconds });
}
