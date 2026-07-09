// GET /.netlify/functions/usda-food?fdcId=<id>
// Proxies USDA FoodData Central food detail and normalizes macros to a
// stable per-100g shape (plus label serving info when the food is Branded).
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

// USDA nutrient numbers are stable across data types; names vary slightly.
const NUTRIENT_NUMBERS = {
  calories: "208", // Energy (kcal)
  protein_g: "203", // Protein
  fat_g: "204", // Total lipid (fat)
  carbs_g: "205", // Carbohydrate, by difference
  fiber_g: "291", // Fiber, total dietary
};

exports.handler = async (event) => {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return json(500, { error: "USDA_API_KEY is not set in Netlify environment variables." });
  }

  const fdcId = (event.queryStringParameters && event.queryStringParameters.fdcId || "").trim();
  if (!fdcId) {
    return json(400, { error: "Missing required query param: fdcId" });
  }

  const url = new URL(`${USDA_BASE}/food/${encodeURIComponent(fdcId)}`);
  url.searchParams.set("api_key", apiKey);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) {
      return json(res.status, { error: data.error || "USDA food lookup failed" });
    }

    const per100g = extractPer100g(data.foodNutrients || []);
    const labelNutrients = data.labelNutrients || null; // present for Branded foods

    return json(200, {
      fdcId: data.fdcId,
      description: data.description,
      dataType: data.dataType,
      servingSize: data.servingSize || null,
      servingSizeUnit: data.servingSizeUnit || null,
      per100g,
      labelNutrients, // { calories: {value}, protein: {value}, fat: {value}, carbohydrates: {value}, ... } per label serving
    });
  } catch (err) {
    return json(502, { error: `Failed to reach USDA API: ${err.message}` });
  }
};

// foodNutrients entries look like:
//   { nutrient: { number: "208", name: "Energy", unitName: "KCAL" }, amount: 165 }
// (full-detail endpoint). Values are per 100g for Foundation/SR Legacy/Branded.
function extractPer100g(foodNutrients) {
  const byNumber = {};
  for (const entry of foodNutrients) {
    const number = entry.nutrient && entry.nutrient.number;
    const amount = typeof entry.amount === "number" ? entry.amount : entry.value;
    if (number != null && typeof amount === "number") {
      byNumber[number] = amount;
    }
  }

  const result = {};
  for (const [key, number] of Object.entries(NUTRIENT_NUMBERS)) {
    result[key] = byNumber[number] != null ? byNumber[number] : 0;
  }
  return result;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
