const fetch = require('node-fetch');

async function triggerDailyTweet() {
  try {
    const response = await fetch('http://localhost:3000/api/twitter/daily-tweet', {
      method: 'POST',
    });
    
    const result = await response.json();
    console.log('Daily tweet process result:', result);
  } catch (error) {
    console.error('Error triggering daily tweet:', error);
  }
}

triggerDailyTweet();
