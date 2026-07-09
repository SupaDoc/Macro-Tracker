// GET /.netlify/functions/usda-search?q=<query>
// Proxies USDA FoodData Central search so USDA_API_KEY never reaches the client.
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

exports.handler = async (event) => {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return json(500, { error: "USDA_API_KEY is not set in Netlify environment variables." });
  }

  const query = (event.queryStringParameters && event.queryStringParameters.q || "").trim();
  if (!query) {
    return json(400, { error: "Missing required query param: q" });
  }

  const url = new URL(`${USDA_BASE}/foods/search`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "15");
  // Prefer data types that reliably carry per-serving/branded label macros
  // as well as clean per-100g reference macros.
  url.searchParams.set("dataType", "Branded,Foundation,SR Legacy");

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) {
      return json(res.status, { error: data.error || "USDA search failed" });
    }

    const foods = (data.foods || []).map((f) => ({
      fdcId: f.fdcId,
      description: f.description,
      brandOwner: f.brandOwner || null,
      dataType: f.dataType,
      servingSize: f.servingSize || null,
      servingSizeUnit: f.servingSizeUnit || null,
    }));

    return json(200, { foods });
  } catch (err) {
    return json(502, { error: `Failed to reach USDA API: ${err.message}` });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
