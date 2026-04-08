import Stripe from "npm:stripe@^13.10.0";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

async function force() {
    try {
        const acct = await stripe.accounts.retrieve("acct_1TJS9U3l4HgEJUPL");
        console.log("Status before:", acct.charges_enabled, acct.payouts_enabled);
        console.log("Requirements currently due:", acct.requirements.currently_due);
        
        // In test mode, we might need to accept the TOS or provide some fake data to clear requirements
        if (acct.requirements.currently_due.length > 0) {
            console.log("Needs data!");
             // We can't trivially simulate everything, but let's see what's due
        }
    } catch(e) {
        console.error(e);
    }
}
force();
