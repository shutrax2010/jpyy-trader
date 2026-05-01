import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { privateKey } = req.body as { privateKey?: string };
    if (!privateKey) return res.status(400).json({ error: '秘密鍵が必要です' });
    // モック: 固定アドレスを返す
    return res.status(200).json({ ok: true, address: '0xMOCK1234567890abcdef1234567890abcdef12' });
  }
  if (req.method === 'DELETE') {
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', 'POST, DELETE');
  res.status(405).json({ error: 'Method Not Allowed' });
}
