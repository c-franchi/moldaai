declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    MOLDAE_ADMIN_EMAIL?: string;
    OPENAI_API_KEY?: string;
    OPENAI_KEY_SECRET?: string;
    MOLDAE_AI_ENABLED?: string;
    MOLDAE_AI_DAILY_LIMIT?: string;
    MOLDAE_AI_MONTHLY_LIMIT?: string;
    BUCKET?: R2Bucket;
  }
}
