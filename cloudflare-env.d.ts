declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    MOLDAE_ADMIN_EMAIL?: string;
    BUCKET?: R2Bucket;
  }
}
