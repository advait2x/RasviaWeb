const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function check() {
  const account = await stripe.accounts.retrieve('acct_1TJS9U3l4HgEJUPL');
  console.log("Details Submitted:", account.details_submitted);
  console.log("Currently Due:", account.requirements.currently_due);
  console.log("Eventually Due:", account.requirements.eventually_due);
  console.log("Capabilities:", account.capabilities);
}
check();
