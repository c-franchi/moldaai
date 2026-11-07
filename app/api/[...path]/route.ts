import { env } from 'cloudflare:workers';
import { handleAPI } from '../../../server/api.mjs';
export const dynamic='force-dynamic';
export const GET=(r:Request)=>handleAPI(r,env);
export const POST=GET;
export const PATCH=GET;
export const DELETE=GET;
