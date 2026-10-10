const express = require('express');
const app = express();
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'saad-verify-2026';
const WEBHOOK_SITE_TOKEN = process.env.WEBHOOK_SITE_TOKEN || 'd1bf0c96-c7dc-467f-9d87-bd4a81e7ca94';
const PORT = process.env.PORT || 3000;
const ALLOWED_NUMBERS = new Set(["923049594229"]);
app.use(express.json());
async function forwardToWebhookSite(payload) {
  try {
    const res = await fetch(`https://webhook.site/${WEBHOOK_SITE_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error(`Forward failed: ${res.status}`);
  } catch (e) { console.error('Forward failed:', e?.message); }
}
app.get('/api/webhook', (req, res) => {
  if (req.query.ping) return res.status(200).json({ status: 'alive' });
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.status(403).send('Forbidden');
});
app.get('/', (req, res) => {
  if (req.query['hub.mode']) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.status(403).send('Forbidden');
  }
  res.status(200).send('Saad WhatsApp Webhook - Running');
});
app.post('/api/webhook', async (req, res) => {
  try {
    const body = req.body;
    for (const entry of body?.entry || []) {
      for (const change of entry?.changes || []) {
        for (const msg of change?.value?.messages || []) {
          const from = msg.from;
          if (!from || !ALLOWED_NUMBERS.has(from)) continue;
          if (msg.type === 'audio' && msg.audio?.id) {
            await forwardToWebhookSite({ from, audio_id: msg.audio.id, id: msg.id, timestamp: msg.timestamp });
          } else if (msg.type === 'text' && msg.text?.body) {
            await forwardToWebhookSite({ from, text: msg.text.body, id: msg.id, timestamp: msg.timestamp });
          }
        }
      }
    }
    return res.status(200).send('OK');
  } catch (e) { return res.status(200).send('OK'); }
});
app.post('/', async (req, res) => { req.url = '/api/webhook'; app.handle(req, res); });
app.listen(PORT, () => console.log(`Webhook running on port ${PORT}`));
