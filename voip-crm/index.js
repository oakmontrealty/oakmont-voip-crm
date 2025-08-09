/*
 * VoIP CRM Backend
 *
 * This Express application acts as the back end for a simple cloud‑based
 * customer relationship management (CRM) and voice‑over‑internet‑protocol
 * (VoIP) platform. It exposes endpoints for generating Twilio access
 * tokens used by clients to connect to Twilio’s Programmable Voice
 * service, provides a basic TwiML voice response for inbound calls and
 * demonstrates how Supabase could be integrated for storing and
 * retrieving user data. The environment variables used by this
 * application are defined in `.env.example`; copy that file to `.env`
 * and replace the placeholder values with your real credentials.
 */

require('dotenv').config();

const express     = require('express');
const twilio      = require('twilio');
const { createClient } = require('@supabase/supabase-js');

const app  = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// -----------------------------------------------------------------------------
// Route aliases so that top‑level paths (e.g. https://…/) map to our API
// handlers below. These aliases simply rewrite the URL and pass control on.
app.all('/', (req, res, next) => {
  // rewrite to actual handler. Using the same path ensures the handler
  // defined below will be invoked.
  req.url = '/api';
  next();
});

// Alias so https://…/test-call works
app.all('/test-call', (req, res, next) => {
  req.url = '/api/test-call';
  next();
});

// -----------------------------------------------------------------------------
// Supabase client (optional). Only initialise if URL and anon key are provided.
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

// -----------------------------------------------------------------------------
// Twilio configuration. These must be set in your environment.
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey     = process.env.TWILIO_API_KEY;
const apiSecret  = process.env.TWILIO_API_SECRET;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
const twilioNumber = process.env.TWILIO_NUMBER;

// -----------------------------------------------------------------------------
// Endpoint to generate a Twilio access token.
//
// Clients call this endpoint to receive a token they can use to connect to
// Twilio’s Programmable Voice service. An optional `identity` query parameter
// can be passed; otherwise a default of “guest” is used.
app.get('/token', (req, res) => {
  try {
    const identity = (req.query.identity || 'guest').toString();

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant  = AccessToken.VoiceGrant;

    // Create a Voice grant which enables this token to make and receive
    // calls via the TwiML App. Incoming calls are also allowed so that
    // Twilio will connect calls to this client if configured.
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    });

    const token = new AccessToken(
      accountSid,
      apiKey,
      apiSecret,
      { identity }
    );
    token.addGrant(voiceGrant);

    res.json({ identity, token: token.toJwt() });
  } catch (err) {
    console.error('Error generating token:', err);
    res.status(500).json({ error: 'Unable to generate token' });
  }
});

// -----------------------------------------------------------------------------
// Basic TwiML voice endpoint.
//
// When Twilio makes a webhook request to this endpoint (for example, when
// someone dials a Twilio number associated with your TwiML app), the
// response will either dial another number/client passed in the `To`
// parameter or play a message if no destination is provided.
app.post('/voice', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const to    = req.body.To;

  if (to) {
    const dial = twiml.dial();
    // If the `To` parameter is a client identifier (prefixed with “client:”),
    // Twilio will dial a client instead of a phone number.
    if (to.startsWith('client:')) {
      dial.client(to.replace(/^client:/, ''));
    } else {
      dial.number(to);
    }
  } else {
    twiml.say('Welcome to Oakmont Realty VOIP CRM');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// -----------------------------------------------------------------------------
// API handler for test call.
//
// This endpoint is used by the front end to place a test call to a phone
// number (specified by the `to` query parameter). It uses the Twilio REST
// API to initiate the call and returns the resulting call object as JSON.
app.get('/api/test-call', async (req, res) => {
  const { to } = req.query;
  if (!to) {
    return res.status(400).json({ error: 'Missing `to` query parameter' });
  }

  try {
    const client = twilio(apiKey, apiSecret, { accountSid });
    const call   = await client.calls.create({
      url: 'http://demo.twilio.com/docs/voice.xml',
      to,
      from: twilioNumber,
    });

    res.json(call);
  } catch (err) {
    console.error('Error initiating test call', err);
    res.status(500).json({ error: 'Unable to initiate test call' });
  }
});

// -----------------------------------------------------------------------------
// (Optional) root handler. If someone navigates to `/api`, you could return
// basic information here or a list of available routes.
app.get('/api', (req, res) => {
  res.json({
    message: 'Oakmont VOIP CRM API is running.',
    endpoints: ['/token', '/voice', '/test-call'],
  });
});

// Dialer page to make VoIP calls from the browser
app.get('/dialer', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Oakmont Dialer</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; }
    .row { display:flex; gap:8px; align-items:center; margin: 8px 0; }
    input { padding:8px; min-width: 260px; }
    button { padding:8px 12px; cursor:pointer; }
    #log { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; background:#f7f7f7; padding:12px; border-radius:6px; margin-top:12px; }
  </style>
  <script src="https://unpkg.com/@twilio/voice-sdk@2.9.1/dist/twilio-voice.min.js"></script>
</head>
<body>
  <h1>Oakmont Dialer</h1>
  <div class="row"><button id="btnInit">Initialise Device</button><span id="status">Not ready</span></div>
  <div class="row">
    <input id="to" placeholder="Enter number in E.164 e.g. +614XXXXXXXX" />
    <button id="btnCall" disabled>Call</button>
    <button id="btnHangup" disabled>Hang up</button>
    <button id="btnMute" disabled>Mute</button>
  </div>
  <div id="log"></div>

  <script>
    const logEl = document.getElementById('log');
    const statusEl = document.getElementById('status');
    const toEl = document.getElementById('to');
    const btnInit = document.getElementById('btnInit');
    const btnCall = document.getElementById('btnCall');
    const btnHangup = document.getElementById('btnHangup');
    const btnMute = document.getElementById('btnMute');
    let device, conn, muted = false;

    function log(msg) { logEl.textContent += msg + '\n'; console.log(msg); }

    async function getToken() {
      const identity = 'agent_' + Date.now();
      const resp = await fetch('/token?identity=' + encodeURIComponent(identity));
      if (!resp.ok) throw new Error('Token fetch failed: ' + resp.status);
      return resp.json();
    }

    btnInit.onclick = async () => {
      try {
        const { token, edge } = await getToken();
        device = new Twilio.Voice.Device(token, {
          codecPreferences: ['opus'],
          edge: edge || 'au1',
          maxAverageBitrate: 40000
        });
        device.on('ready', () => { statusEl.textContent = 'Ready'; btnCall.disabled = false; log('Device ready'); });
        device.on('error', e => log('Device error: ' + e.message));
        device.on('incoming', c => { conn = c; log('Incoming call'); });
        device.on('disconnect', () => { conn = null; btnHangup.disabled = true; btnMute.disabled = true; log('Disconnected'); });
        log('Initialising device...');
      } catch (e) { log('Init failed: ' + e.message); }
    };

    btnCall.onclick = async () => {
      try {
        const to = toEl.value.trim();
        if (!to) { alert('Enter destination number'); return; }
        conn = await device.connect({ params: { To: to } });
        btnHangup.disabled = false; btnMute.disabled = false;
        conn.on('accept', () => log('Call accepted'));
        conn.on('disconnect', () => { btnHangup.disabled = true; btnMute.disabled = true; log('Call ended'); });
        conn.on('error', e => log('Conn error: ' + e.message));
        log('Dialling ' + to + '...');
      } catch (e) { log('Call failed: ' + e.message); }
    };

    btnHangup.onclick = () => { if (conn) conn.disconnect(); };
    btnMute.onclick = () => {
      if (conn) {
        muted = !muted;
        conn.mute(muted);
        btnMute.textContent = muted ? 'Unmute' : 'Mute';
      }
    };
  </script>
</body>
</html>`);
}
   
       ).
  
  const TEST_CALL_TOKEN = process.env.TEST_CALL_TOKEN;
const to = process.env.TEST_CALL_TO;
const from = process.env.TWILIO_NUMBER;
const mp3 = process.env.PRANK_MP3_URL || 'https://demo.twilio.com/docs/classic.mp3';

async function callMyClipHandler(req, res) {
  try {
    if (TEST_CALL_TOKEN) {
      const t = req.method === 'GET' ? req.query.token : req.body?.token;
      if (t !== TEST_CALL_TOKEN) return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const call = await twilio.calls.create({
      to,
      from,
      twiml: `<Response><Play>${mp3}</Play></Response>`
    });
    return res.json({ ok: true, sid: call.sid });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'call-failed' });
  }
}

app.get('/api/call-my-clip', callMyClipHandler);
app.post('/api/call-my-clip', callMyClipHandler);
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
/
