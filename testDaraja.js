import 'dotenv/config';

async function testDaraja() {
  const baseUrl = process.env.MPESA_SANDBOX_BASE_URL || 'https://sandbox.safaricom.co.ke';
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  
  console.log('key:', JSON.stringify(key));
  console.log('secret:', JSON.stringify(secret));

  const authHeader = Buffer.from(`${key}:${secret}`).toString('base64');
  console.log('authHeader:', authHeader);
  console.log('URL:', `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`);

  try {
    const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: { Authorization: `Basic ${authHeader}` },
    });
    console.log('status:', response.status);
    console.log('body:', await response.text());
  } catch (err) {
    console.error(err);
  }
}

testDaraja();
