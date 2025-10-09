const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  
  if (req.method === 'POST' && parsedUrl.pathname === '/v1/demos/start') {
    console.log('Demo start requested');
    
    const response = {
      guest_id: 'demo-' + Date.now(),
      run_id: 'run-' + Date.now(),
      beat: {
        index: 0,
        narration: "Welcome to the Haunted Shore! You find yourself standing on a mysterious coastline where the waves whisper ancient secrets. The air is thick with salt and mystery. What do you choose to do?",
        choices: [
          { id: 1, text: "Explore the abandoned lighthouse" },
          { id: 2, text: "Walk along the shoreline" },
          { id: 3, text: "Listen to the whispers in the wind" }
        ]
      },
      audio: null,
      guardrails: { sanitizedNarration: "Content is safe" }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Not found' }));
  }
});

const PORT = 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Mock API running on port ${PORT}`);
  console.log('Demo endpoint available at: http://localhost:4000/v1/demos/start');
});