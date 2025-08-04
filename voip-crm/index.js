/*
 * VoIP CRM Backend
 *
 * This Express application acts as the back‑end for a simple cloud‑based
 * customer relationship management (CRM) and voice over internet protocol
 * (VoIP) platform. It exposes endpoints for generating Twilio access
 * tokens used by clients to connect to Twilio's Programmable Voice
 * service, provides a basic TwiML voice response for inbound calls and
 * demonstrates how Supabase could be integrated for storing and
 * retrieving user data. The environment variables used by this
 * application are defined in `.env.example`; copy that file to `.env`
 * and replace the placeholder values with your real credentials.
 */

require('dotenv').config();

const express = require('express');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Alias so https://.../test-call works
app.all('/test-call', (req, res, next) => {
  // rewrite to actual handler. Using the same path ensures the handler
  // defined below will be invoked.
  req.url = '/test-call';
  next();
});

// Initialise Supabase client if configured
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY);
}

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

/**
 * Generates an access token for the client. The token includes a
 * VoiceGrant which allows both outbound and inbound calls when used
 * with the Twilio Device SDK on the client side. The client's
 * identity can be passed as a query parameter; if none is provided,
 * a generic identity is used.
 */
app.get('/token', (req, res) => {
  try {
    const identity = (req.query.identity || 'guest').toString();
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create a Voice grant which enables this token to make and receive
    // calls via the TwiML App. Incoming calls are allowed so that
    // Twilio will connect calls to this client if configured.
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true
    });

    const token = new AccessToken(accountSid, apiKey, apiSecret, { identity });
    token.addGrant(voiceGrant);
    res.json({ identity, token: token.toJwt() });
  } catch (err) {
    console.error('Error generating token:', err);
    res.status(500).json({ error: 'Unable to generate token' });
  }
});

/**
 * Basic TwiML voice endpoint. When Twilio makes a webhook request to
 * this endpoint (for example, when someone dials a Twilio number
 * associated with your TwiML app), the response will either dial
 * another number/client passed in the `To` parameter or play a message
 * if no destination is provided. You can customise this behaviour
 * depending on your application needs.
 */
app.post('/voice', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const to = req.body.To;
  if (to) {
    const dial = twiml.dial();
    // If the `To` parameter is a client identifier (prefixed with "client:"),
    // Twilio will dial a client instead of a phone number.
    if (to.startsWith('client:')) {
      dial.client(to.replace(/^client:/, ''));
    } else {
      dial.number(to);
    }
  } else {
    twiml.say('Thanks for calling. Please provide a number to dial.');
  }
  res.type('text/xml');
  res.send(twiml.toString());
});

/**
 * Example authenticated endpoint using Supabase. This demonstrates how
 * you might protect endpoints and fetch user data from the Supabase
 * database. In a real application you would implement proper
 * authentication (e.g. JWTs) and authorisation checks.
 */
app.get('/profile', async (req, res) => {
  if (!supabase) {
    return res.status(501).json({ error: 'Supabase not configured' });
  }
  // In a production system you would derive the current user from a
  // session token or JWT. For demonstration we accept an `id`
  // query parameter and fetch the corresponding row from a `profiles`
  // table.
  const userId = req.query.id;
  if (!userId) {
    return res.status(400).json({ error: 'Missing id' });
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Supabase error:', err);
    res.status(500).json({ error: 'Unable to fetch profile' });
  }
});

// Test Call endpoint: initiates a call to the specified number using Twilio
app.get('/test-call', async (req, res) => {
  const to = req.query.to;
  if (!to) {
    return res.status(400).json({ error: 'Missing to parameter' });
  }
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    const call = await client.calls.create({
      to,
      from: process.env.TWILIO_DEFAULT_FROM,
      twiml: '<Response><Say>Hello Terence, this is the VOIP‑CRM test call.</Say></Response>'
    });
    return res.json({ sid: call.sid });
  } catch (error) {
    console.error('Error initiating test call:', error);
    return res.status(500).json({ error: 'Failed to initiate call' });
  }
});

app.listen(port, () => {
  console.log(`VoIP CRM server listening on port ${port}`);
});
