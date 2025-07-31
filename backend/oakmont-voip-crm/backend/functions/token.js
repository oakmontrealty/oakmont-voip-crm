// backend/functions/token.js
// Minimal Supabase Edge Function: returns a Twilio Voice JWT
import { createClient } from "@supabase/supabase-js";
import Twilio from "twilio";

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_APP_SID
} = process.env;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const handler = async (req, res) => {
  const { data: { user } } = await supabase.auth.getUser(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const AccessToken = Twilio.jwt.AccessToken;
  const VoiceGrant  = AccessToken.VoiceGrant;

  const token = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_APP_SID,
    TWILIO_AUTH_TOKEN,
    { identity: user.id, ttl: 3600 }
  );
  token.addGrant(new VoiceGrant({
    outgoingApplicationSid: TWILIO_APP_SID,
    incomingAllow: true
  }));

  res.json({ token: token.toJwt() });
};
