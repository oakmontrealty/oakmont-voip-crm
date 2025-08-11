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
