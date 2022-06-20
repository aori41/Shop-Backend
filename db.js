import * as mongodb from 'mongodb';

const client = new mongodb.MongoClient(process.env.DATA_BASE);

export const usersCollection = client.db("shop").collection("users");
export const tokensCollection = client.db("shop").collection("tokens");
export const productsCollection = client.db("shop").collection("products");
export const cartCollection = client.db("shop").collection("cart");
export const ranksCollection = client.db("shop").collection("ranks");

export async function init() {
    await client.connect();
    await updateDataBase();
    console.log("Connected to MongoDB");
}

async function updateDataBase() {
    let rankExists = await ranksCollection.findOne({ rank: "guest" });
    if (!rankExists) {
        await ranksCollection.insertOne({
            rank: "guest",
            access: [
                "view.products"
            ]
        });
    }
    rankExists = await ranksCollection.findOne({ rank: "user" });
    if (!rankExists) {
        await ranksCollection.insertOne({
            rank: "user",
            access: [
                "view.products",
                "buy.products",
                "edit.products",
                "remove.product"
            ]
        });
    }
    rankExists = await ranksCollection.findOne({ rank: "Owner" });
    if (!rankExists) {
        await ranksCollection.insertOne({
            rank: "Owner",
            access: [
                "add.rank",
                "edit.rank",
                "delete.rank",
                "add.user.access",
                "edit.user.access",
                "remove.user.access",
                "delete.user",
                "delete.user.product",
                "view.admins",
                "add.product",
                "edit.product",
                "delete.product",
                "buy.products",
                "edit.products",
                "remove.product",
                "view.products"
            ]
        });
    }
}
