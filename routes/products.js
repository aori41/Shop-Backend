import express from 'express';
import { ObjectId } from 'mongodb';
const route = express.Router();
import { productsCollection, tokensCollection } from "../db.js";
import { validateToken, hasAccess } from "../utils.js";
import { uploadUrl, deleteUrl } from '../s3.js';

route.get("/products", async (req, res) => { // Get all products
    const { fromPrice, toPrice, categories } = req.query;
    const query = {};
    console.log(fromPrice, toPrice);
    if (fromPrice || toPrice) {
        query["productPrice"] = {};

        fromPrice && (query["productPrice"]["$gte"] = +fromPrice);
        toPrice && (query["productPrice"]["$lte"] = +toPrice);
    }
    if (categories) {
        const split = categories.split(" ");
        query["categories"] = { $in: split };
    }
    console.log(query);
    res.json({
        Products: await productsCollection.find(query).toArray()
    });
});

route.get("/product", async (req, res) => { // Get product
    const productId = req.query.id;
    if (!productId || productId.length !== 24) {
        res.status(400).json({ message: "Not a valid product id" });
        return;
    }
    const id = new ObjectId(productId);
    res.json({
        Product: await productsCollection.findOne({ _id: id })
    });
});

route.get('/s3Url', async (req, res) => {
    const url = await uploadUrl();
    res.json({ url });
});

route.post("/products", validateToken, async (req, res) => {
    const token = res.locals.token;
    const { productName, productDescription, productPrice, productImagesURL, productColors, productSize, categories, quantity } = req.body;
    if (!productName || !productPrice || !categories) {
        res.status(400).json({ message: "Not a valid product" });
        return;
    }
    const userAccess = await hasAccess(token, "add.product");
    if (token && !userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    const user = await tokensCollection.findOne({ token });
    await productsCollection.insertOne({
        seller: user.username,
        productName,
        productDescription,
        productPrice: +productPrice,
        productImagesURL,
        productColors,
        productSize,
        categories,
        quantity: (quantity ? quantity : 1)
    });
    res.status(201).json({ message: "Product " + productName + " has added successfully" });
});

route.patch("/products", validateToken, async (req, res) => {
    const token = res.locals.token;
    const { productName, productDescription, productPrice, productColors, productSize, categories, quantity } = req.body;
    const productId = req.query.id;
    if (!productId || productId.length !== 24) {
        res.status(400).json({ message: "Not a valid product id" });
        return;
    }
    if (!productName || !productPrice || !categories) {
        res.status(400).json({ message: "Not a valid product" });
        return;
    }
    const id = new ObjectId(productId);
    const userAccess = await hasAccess(token, "edit.product");
    const user = await tokensCollection.findOne({ token });
    const productObj = await productsCollection.findOne({ _id: id });
    if(!productObj) {
        res.status(400).json({ message: "Not a valid product id" });
        return;
    }
    if (token && !userAccess && productObj.seller !== user.username) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    if (productObj.productName !== productName) {
        await productsCollection.updateOne({ _id: id }, { "$set": { productName } });
    }
    if (productObj.productDescription !== productDescription) {
        await productsCollection.updateOne({ _id: id }, { "$set": { productDescription } });
    }
    if (productObj.productPrice !== productPrice) {
        await productsCollection.updateOne({ _id: id }, { "$set": { productPrice } });
    }
    if (productObj.productColors !== productColors) {
        await productsCollection.updateOne({ _id: id }, { "$set": { productColors } });
    }
    if (productObj.productSize !== productSize) {
        await productsCollection.updateOne({ _id: id }, { "$set": { productSize } });
    }
    if (productObj.quantity !== quantity && quantity >= 1) {
        await productsCollection.updateOne({ _id: id }, { "$set": { quantity } });
    }
    if (productObj.productImagesURL !== productImagesURL) {
        for (let i = 0; i < productObj.productImagesURL.length; i++) {
            if (!productImagesURL.includes(productObj.productImagesURL[i])) {
                await deleteUrl(productObj.productImagesURL[i]);
            }
        }
        await productsCollection.updateOne({ _id: id }, { "set": { productImagesURL } });
    }
    res.json({ message: productObj.productName !== productName ? productName : productObj.productName + "has edited successfully" })
});

route.delete("/products", validateToken, async (req, res) => {
    const token = res.locals.token;
    const productId = req.query.id;
    if (!productId || productId.length !== 24) {
        res.status(400).json({ message: "Not a valid product id" });
        return;
    }
    const id = new ObjectId(productId);
    const userAccess = await hasAccess(token, "delete.product");
    const user = await tokensCollection.findOne({ token });
    const productObj = await productsCollection.findOne({ _id: id });
    if(!productObj) {
        res.status(404).json({ message: "Product not found" });
        return;
    }
    if (token && !userAccess && productObj.seller !== user.username) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    if (productObj.productImagesURL && productObj.productImagesURL.length > 0) {
        for (let i = 0; i < productObj.productImagesURL.length; i++) {
            await deleteUrl(productObj.productImagesURL[i]);
        }
    }
    await productsCollection.deleteOne({ _id: id });
    res.json({ message: "Product deleted successfully" });
});

export default route;