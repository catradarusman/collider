import { ideas } from '../../backend/core.js';

const resp = (statusCode, obj) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return resp(400, { error: 'Invalid JSON body' }); }
  try { return resp(200, await ideas(body)); }
  catch (e) { return resp(e.status || 500, { error: e.message }); }
};
