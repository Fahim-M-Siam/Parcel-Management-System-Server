// @ts-nocheck
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zdityrz.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // DBCollections
    const userCollection = client.db("ShipEaseDB").collection("users");
    const bookingCollection = client.db("ShipEaseDB").collection("bookings");

    // jwt middleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.type === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };
    // verifyDeliveryMen
    const verifyDeliveryMen = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isDeliveryMen = user?.type === "DeliveryMen";
      if (!isDeliveryMen) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    //user related api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User Already Exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.get("/registeredUsers", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.get("/homeAllBookings", async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    });
    app.get("/allDelivered", async (req, res) => {
      const status = req.query.status;
      const query = { status: status };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10h",
      });
      res.send({ token });
    });

    // admin checking
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.type === "admin";
      }
      res.send({ admin });
    });
    // deliveryMen checking

    app.get("/users/deliveryMen/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let deliveryMen = false;
      if (user) {
        deliveryMen = user?.type === "DeliveryMen";
      }
      res.send({ deliveryMen });
    });

    // make admin api
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            type: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
    // make delivery api
    app.patch(
      "/users/deliveryMen/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            type: "DeliveryMen",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    // user booking related api
    app.post("/bookings", async (req, res) => {
      const bookingItem = req.body;
      const result = await bookingCollection.insertOne(bookingItem);
      res.send(result);
    });
    app.get("/bookings", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    //  get parcel item to update
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.findOne(query);
      res.send(result);
    });
    app.patch("/bookings/:id", async (req, res) => {
      const updatedBookingItem = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          userName: updatedBookingItem.userName,
          email: updatedBookingItem.email,
          userNumber: updatedBookingItem.userNumber,
          parcelType: updatedBookingItem.parcelType,
          parcelWeight: updatedBookingItem.parcelWeight,
          price: updatedBookingItem.price,
          receiverName: updatedBookingItem.receiverName,
          receiverNumber: updatedBookingItem.receiverNumber,
          requestedDate: updatedBookingItem.requestedDate,
          receiverAddress: updatedBookingItem.receiverAddress,
          locationLatitude: updatedBookingItem.locationLatitude,
          locationLongtitude: updatedBookingItem.locationLongtitude,
          approximateDate: updatedBookingItem.approximateDate,
          deliveryMenId: updatedBookingItem.deliveryMenId,
          bookingDate: updatedBookingItem.bookingDate,
          status: updatedBookingItem.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.delete("/bookings/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // admin routes related api

    // all parcel api
    app.get("/allBookings", verifyToken, verifyAdmin, async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    });

    // all users api
    app.get("/allUsers", verifyToken, verifyAdmin, async (req, res) => {
      const type = req.query.type;
      const query = { type: type };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // modifying booking with deliveryMen
    app.put("/allBookings", verifyToken, verifyAdmin, async (req, res) => {
      const updated = req.body;
      const id = req.query.id;
      const query = { _id: new ObjectId(id) };
      const upsert = { upsert: true };
      const updatedDoc = {
        $set: {
          status: updated.status,
          approximateDate: updated.approximateDate,
          deliveryMenId: updated.deliverMenId,
        },
      };

      const result = await bookingCollection.updateOne(
        query,
        updatedDoc,
        upsert
      );
      res.send(result);
    });

    // admin routes related api

    // delivermen routes related api
    app.get(
      "/allDeliveryBookings",
      verifyToken,
      verifyDeliveryMen,
      async (req, res) => {
        const id = req.query.id;
        const query = { deliveryMenId: id };
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
      }
    );
    // updating cancel status
    app.put(
      "/allDeliveryBookings",
      verifyToken,
      verifyDeliveryMen,
      async (req, res) => {
        const updated = req.body;
        const id = req.query.id;
        const query = { _id: new ObjectId(id) };
        const upsert = { upsert: true };
        const updatedDoc = {
          $set: {
            status: updated.status,
          },
        };

        const result = await bookingCollection.updateOne(
          query,
          updatedDoc,
          upsert
        );
        res.send(result);
      }
    );
    // updating delivered status
    app.put(
      "/allDeliveryBookings",
      verifyToken,
      verifyDeliveryMen,
      async (req, res) => {
        const updated = req.body;
        const id = req.query.id;
        const query = { _id: new ObjectId(id) };
        const upsert = { upsert: true };
        const updatedDoc = {
          $set: {
            status: updated.status,
          },
        };

        const result = await bookingCollection.updateOne(
          query,
          updatedDoc,
          upsert
        );
        res.send(result);
      }
    );

    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

// testing
app.get("/", (req, res) => {
  res.send("Ship-Ease Server is runnig");
});

app.listen(port, () => {
  console.log(`Ship-Ease server is running on port: ${port}`);
});
