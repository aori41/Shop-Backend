import express from 'express';
import { ObjectId } from 'mongodb';
const route = express.Router();
import { productsCollection, tokensCollection, cartCollection } from "../db.js";
import  { validateToken, hasAccess } from "../utils.js";

route.get("/cart", validateToken, async (req, res) => {
    const token = res.locals.token;
    const user = await tokensCollection.findOne({ token });
    if(!user) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    }
    const userCart = await cartCollection.findOne({ username: user.username });
    if (!userCart) {
        res.json({ message: "Cart is empty" });
        return;
    } else {
        res.json({
            Cart: userCart
        });
    }
});

route.post("/products", validateToken, async (req, res) => {
    const token = res.locals.token;
    const { productColor, productSize, quantity: any } = req.body;
    const productId = req.query.buy;
    if (!productId || productId.length !== 24) {
        res.status(400).json({ message: "Not a valid product id" });
        return;
    }
    const userAccess = await hasAccess(token, "buy.products");
    if (token && !userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    if (!quantity) quantity = 1;
    const id = new ObjectId(productId);
    const user = await tokensCollection.findOne({ token });
    const productObj = await productsCollection.findOne({ _id: id });
    if(!productObj) {
        res.status(400).json({ message: "Not a valid product id" });
        return;
    }
    const cartObj = await cartCollection.findOne({ username: user.username });
    if (!cartObj) {
        await cartCollection.insertOne({
            username: user.username,
            products: [{
                productId,
                productName: productObj.productName,
                productDescripotion: productObj.productDescripotion,
                productPrice: +productObj.productPrice,
                productColor,
                productSize,
                quantity: +quantity
            }]
        });
    } else {
        let inCart = false;
        for (let i = 0; i < cartObj.products.length; i++) {
            if (cartObj.products[i].productId == id) {
                inCart = true;
                break;
            }
        }
        if (inCart) {
            res.json({ message: "This item already in cart" });
            return;
        } else {
            await cartCollection.updateOne({ username: user.username }, {
                "$push": {
                    products: {
                        productId,
                        productName: productObj.productName,
                        productDescripotion: productObj.productDescripotion,
                        productPrice: +productObj.productPrice,
                        productColor,
                        productSize,
                        quantity: +quantity
                    }
                }
            });
        }
    }
    res.status(201).json({ message: "Product added successfully" });
});

route.patch("/products", validateToken, async (req, res) => {
    const token = res.locals.token;
    const { productColor, productSize, quantity } = req.body;
    const productId = req.query.edit;
    if (!productId || productId.length !== 24) {
        res.status(400).json({ message: "Not a valid product id" });
        return;
    }
    const userAccess = await hasAccess(token, "edit.products");
    if (token && !userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    const id = new ObjectId(productId);
    const user = await tokensCollection.findOne({ token });
    const cartObj = await cartCollection.findOne({ username: user.username });
    if(!cartObj) {
        res.status(400).json({ message: "Cart is empty" });
        return;
    }
    for (let i = 0; i < cartObj.products.length; i++) {
        if (cartObj.products[i].productId == id) {
            if (cartObj.products[i].productColor != productColor && productColor) cartObj.products[i].productColor = productColor;
            if (cartObj.products[i].productSize != productSize && productSize) cartObj.products[i].productSize = productSize;
            if (cartObj.products[i].quantity != quantity && quantity) cartObj.products[i].quantity = +quantity;
            break;
        }
    }
    await cartCollection.updateOne({ username: user.username }, { "$set": { products: cartObj.products } });
    res.json({ message: "Item has been updated" });
});

route.delete("/products", validateToken, async (req, res) => {
    const token = res.locals.token;
    const productId = req.query.remove;
    if (!productId || productId.length !== 24) {
        res.status(400).json({ message: "Not a valid product id" });
        return;
    }
    const userAccess = await hasAccess(token, "remove.products");
    if (token && !userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    const id = new ObjectId(productId);
    const user = await tokensCollection.findOne({ token });
    const cartObj = await cartCollection.findOne({ username: user.username });
    if(!cartObj) {
        res.json({ message: "Cart is empty" });
        return;
    }
    for (let i = 0; i < cartObj.products.length; i++) {
        if (cartObj.products[i].productId == id) {
            await cartCollection.updateOne({ username: user.username }, { "$pull": { products: cartObj.products[i] } });
            break;
        }
    }
    res.json({ message: "Product removed from the cart" });
});

export default route;