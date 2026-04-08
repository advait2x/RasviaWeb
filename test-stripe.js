const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function check() {
  const account = await stripe.accounts.retrieve('acct_1TJRxc3U1jc2s3re');
  console.log(JSON.stringify(account, null, 2));
}

check();
