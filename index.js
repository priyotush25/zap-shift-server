const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 3000;
const stripe = require("stripe")(process.env.STRIPE_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ke7g9qv.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("zap_shift_db");
    const parcelCollection = db.collection("parcels");

    // parcel api
    app.get("/parcels", async (req, res) => {
      const query = {};
      const { email } = req.query;

      console.log(email);

      if (email) {
        query.senderEmail = email;
      }

      const option = { sort: { createdAt: -1 } };

      const cursor = parcelCollection.find(query, option);
      const result = await cursor.toArray();

      res.send(result);
    });

    app.get("/parcels/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await parcelCollection.findOne(query);
      res.send(result);
    });

    // create parcel
    app.post("/parcels", async (req, res) => {
      const parcel = req.body;

      parcel.createdAt = new Date();

      const result = await parcelCollection.insertOne(parcel);
      res.send(result);
    });

    // delete parcel
    app.delete("/parcels/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await parcelCollection.deleteOne(query);
      res.send(result);
    });

    // payment realated api 
   
    app.post("/payment-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
       const amount = parseInt(paymentInfo.cost) * 100;

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amount,
              product_data: {
                name: `Please pay for : ${paymentInfo.parcelName}`
              }
            },
            quantity: 1,
          }
        ],
        mode: "payment",
        customer_email,
        success_url: `${process.env.SITE_DOMAIN}?success=true/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}?success=true/dashboard/payment-cancelled`,

      })
      res.send({ url: session.url });

    })





  // payment related API (CLEAN & CORRECT)
app.post("/create-checkout-session", async (req, res) => {
  try {
    const paymentInfo = req.body;

    // amount in cents
    const amount = parseInt(paymentInfo.cost) * 100;

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "USD",
            unit_amount: amount,
            product_data: {
              name: paymentInfo.parcelName,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: paymentInfo.senderEmail,
      mode: "payment",
      metadata: {
        parcelId: paymentInfo.parcelId,
      },
      success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
    });

    res.send({ url: session.url });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).send({ error: error.message });
  }
});









    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
