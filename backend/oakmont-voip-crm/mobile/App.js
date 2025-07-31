import React, { useState, useEffect } from 'react';
import { Text, View, Button } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [token, setToken] = useState(null);

  const fetchToken = async () => {
    const { data, error } = await supabase.functions.invoke('token');
    if (error) console.error(error);
    else setToken(data.token);
  };

  return (
    <View style={{ padding: 50 }}>
      <Text>Oakmont Mobile Dialer</Text>
      <Button title="Fetch Voice Token" onPress={fetchToken} />
      {token && <Text selectable numberOfLines={1}>Token: {token.slice(0, 25)}...</Text>}
    </View>
  );
}
