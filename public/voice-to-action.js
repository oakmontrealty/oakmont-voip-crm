// Replace with your actual Supabase details later
const supabaseUrl = 'https://yourprojectid.supabase.co'; // Paste your Supabase URL here
const supabaseKey = 'eyJhbGc...'; // Paste your anon public key here
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-AU';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

function startVoiceLog(eventName) {
  recognition.start();
  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript.trim();
    const parts = transcript.split(',');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const phone = parts[1].trim();
      const { data, error } = await supabase
        .from('attendees')
        .insert([{ name, phone_number: phone, event: eventName }]);
      if (error) {
        alert('Failed: ' + error.message);
      } else {
        alert('Logged: ' + name + ', ' + phone);
      }
    } else {
      alert('Say "Name, Phone" like "Michael, 0412345678"');
    }
  };
  recognition.onspeechend = () => recognition.stop();
  recognition.onerror = (event) => alert('Error: ' + event.error);
}

document.getElementById('log-attendee-btn').addEventListener('click', () => {
  startVoiceLog('25 Moonstone Place Open House');
});
