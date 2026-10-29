import { S3Client } from '@aws-sdk/client-s3';
import 'dotenv/config';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME?.trim();
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.trim();

export const isR2Configured = Boolean(
  R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME &&
    R2_PUBLIC_URL
);

/**
 * R2's S3-compatible API. Region is always "auto" for R2 — it isn't a real
 * AWS region, Cloudflare just requires the SDK to send one.
 */
export const r2Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;
