import express from 'express';
import paypal from "paypal-rest-sdk";
const route = express.Router();
import { cartCollection, tokensCollection } from '../db.js';
import { validateToken, hasAccess } from '../utils.js';

const paymentCurrency = "ILS";

let totalValue = 0;

paypal.configure({ // paypal-rest-sdk npm package configuration
    'mode': 'sandbox', //sandbox for testing or live
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_CLIENT_SECRET
});

route.get("/cancel", validateToken, async (req, res) => {
    res.json({ message: "Payment cancelled" });
});

route.get("/success", async (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    const execute_payment_json = { // paypal-rest-sdk npm package
        payer_id: payerId,
        transactions: [{
            amount: {
                currency: paymentCurrency,
                total: totalValue
            }
        }]
    };

    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
        if (error) {
            console.log(error.response);
            throw error;
        } else { // payment succeeded
            console.log(JSON.stringify(payment));
            res.redirect("localhost:5000/shop/products"); // return to the shop page 
        }
    });
});

route.post("/payment", validateToken, async (req, res) => {
    const token = res.locals.token;
    const userAccess = await hasAccess(token, "buy.products");
    if (token && !userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    const user = await tokensCollection.findOne({ token });
    const cartObj = await cartCollection.findOne({ username: user.username });
    if(!cartObj) {
        res.status(400).json({ message: "Cart is empty" });
        return;
    }
    totalValue = cartObj.products.reduce((total, item) => {
        return total + item.productPrice * item.quantity;
    }, 0);
    const create_payment_json = { // paypal-rest-sdk npm package
        intent: "sale",
        payer: {
            payment_method: "paypal"
        },
        redirect_urls: {
            return_url: "http://localhost:5000/order/success",
            cancel_url: "http://localhost:5000/order/cancel"
        },
        transactions: [{
            item_list: {
                items: cartObj.products.map((data, index) => {
                    return {
                        name: data.productName,
                        sku: index + 1,
                        price: data.productPrice,
                        currency: paymentCurrency,
                        quantity: data.quantity
                    }
                })
            },
            amount: {
                currency: paymentCurrency,
                total: totalValue
            },
            description: "Your products"
        }]
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            throw error;
        } else {
            for (let i = 0; i < payment.links.length; i++) {
                if (payment.links[i].rel === "approval_url") { // find the success link
                    res.redirect(payment.links[i].href);
                }
            }
        }
    });
});

export default route;