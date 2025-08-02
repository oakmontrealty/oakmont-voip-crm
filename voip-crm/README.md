# VoIP CRM Backend

This repository contains a simple Node.js back‑end to power a voice‑over‑IP (VoIP) and customer relationship management (CRM) application. It is designed as a starting point for building a low‑latency calling platform using [Twilio Programmable Voice](https://www.twilio.com/voice) and [Supabase](https://supabase.com/) for user management and data storage.

## Features

* **Token generation** – The `/token` endpoint creates a Twilio access token with a voice grant. Clients use this token to establish secure WebSocket connections via the Twilio Voice SDK and make or receive calls.
* **TwiML voice webhook** – The `/voice` endpoint returns a [TwiML](https://www.twilio.com/docs/voice/twiml) response. Twilio invokes this webhook when someone calls your Twilio number. The code either dials the destination provided in the `To` parameter or plays a friendly message.
* **Supabase integration** – An example `/profile` endpoint illustrates how to read user data from a Supabase table. You can expand this to support authentication, contact lists, call history, notes and other CRM functionality.

## Getting started

1. **Install dependencies** – Clone this repository and run `npm install` to install the dependencies listed in `package.json` (e.g. `express`, `twilio`, `@supabase/supabase-js` and `dotenv`).

2. **Configure environment variables** – Copy `.env.example` to `.env` and replace all placeholder values with your own credentials:

   * `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` can be found in the Twilio console.
   * Create an API key and secret in the Twilio console and assign them to `TWILIO_API_KEY` and `TWILIO_API_SECRET`. Generate a TwiML application and assign its SID to `TWILIO_TWIML_APP_SID`. Using a TwiML application improves performance by routing media through Twilio’s edges (select the Sydney or Singapore edge to minimise latency for users in Australia or the Philippines).
   * `SUPABASE_URL` and `SUPABASE_ANON_KEY` correspond to your Supabase project. These values enable the anonymous client to read from your database. If you plan to perform privileged operations, create service keys and implement proper authentication.

3. **Run the server** – Start the Express server by running `npm start`. By default it listens on port `3000`, but you can change this via the `PORT` environment variable.

4. **Request a token** – Navigate to `http://localhost:3000/token?identity=alice` to retrieve a JSON object containing a `token`. Your front‑end application will use this token to initialise a Twilio Device instance and connect to your TwiML app. See [Twilio’s client SDK documentation](https://www.twilio.com/docs/voice/client) for implementation details.

5. **Configure your Twilio number** – In the Twilio console, point the voice webhook of your Twilio phone number to your publicly accessible `/voice` endpoint (e.g. using [ngrok](https://ngrok.com/) during development). When someone dials your Twilio number, Twilio will post to this endpoint and your application will respond with instructions.

## Extending the platform

This repository is intentionally minimal. To build a full‑fledged CRM and calling platform you may wish to:

* Implement secure authentication (e.g. JWTs issued after Supabase logins) and protect your endpoints with middleware.
* Create additional Supabase tables to store contacts, call history, notes and tasks.
* Develop a front‑end using a modern framework such as React. For cross‑platform support you could use React Native (for iOS/Android) and Electron (for a desktop client), sharing as much logic as possible between them.
* Integrate with third‑party CRMs like Pipedrive or JustCall by consuming their APIs or importing data. This will allow you to mirror key features like power dialing, click‑to‑call, call logging and automatic note creation.
* Optimise latency by selecting the Twilio edge closest to your users (Sydney for Australia, Singapore for Southeast Asia) and by using the Opus codec and TCP/UDP transports supported by the Twilio Voice SDK. See Twilio’s [edge locations documentation](https://www.twilio.com/docs/global-infrastructure/edge-locations) for details.

## License

This project is provided under the ISC license. Feel free to adapt it for commercial or personal use, but remember to secure your credentials and implement proper authentication before deploying to production.
