async function testFake() {
  const payload = {
    title: "Large sinkhole opening on Road No 36",
    description: "The road surface has collapsed near the metro pillar, creating a massive 4-foot deep sinkhole. Traffic is completely blocked and it is very dangerous for night drivers.",
    category: "Roads",
    location: { lat: 17.432, lng: 78.407 }
  };
  
  try {
    const res = await fetch("http://localhost:3001/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

testFake();
