export const getDeals = async (apiKey) => {
  const res = await fetch('https://api.pipedrive.com/v1/deals?api_token=' + apiKey);
  const json = await res.json();
  return json.data;
};
