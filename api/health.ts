import { methodNotAllowed } from '../serverlib/rudiment';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  return res.status(200).json({
    status: 'ok',
    service: 'Rudiment Drum Coach AI',
    runtime: 'vercel-serverless',
  });
}
