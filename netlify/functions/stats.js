import { stats } from '../../backend/core.js';

const resp = (statusCode, obj) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return resp(405, { error: 'Method not allowed' });
  try { return resp(200, await stats()); }
  catch (e) { return resp(e.status || 500, { error: e.message }); }
};
