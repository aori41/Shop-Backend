import {} from 'dotenv/config';
import express from 'express';
import bcrypt from 'bcrypt';
import emailValidator from 'email-validator';
import accessRouter from './routes/access.js';
import productsRouter from './routes/products.js';
import cartRouter from './routes/cart.js';
import orderRouter from './routes/order.js';
import { makeid } from './utils.js';
import { init, usersCollection, tokensCollection } from './db.js';

const app = express();

const port = process.env.PORT || 5000;

app.use(express.json());
app.use('/access', accessRouter);
app.use("/shop", productsRouter);
app.use("/info", cartRouter);
app.use("/order", orderRouter);

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await usersCollection.findOne({ username });
    if (!username || !user) {
        res.status(404).json({ message: "User does not exist" });
        return;
    }
    if (!password) {
        res.status(400).json({ message: "No password entered" });
        return;
    }
    const result = await bcrypt.compare(password, user.password); // compare encrypted passwords
    if (result) {
        const date = Date.now() + 86400000;
        let token = makeid(64);
        await tokensCollection.insertOne({ username, token, expDate: date });
        res.json({ message: "Login Successful", token });
    } else {
        res.status(400).json({ message: "Login Failed, Incorrect Password" });
    }
});

app.post('/register', async (req, res) => {
    const { username, password, repassword, email } = req.body;
    if (!username || !password || !repassword || !email) {
        res.status(400).json({ message: "Not enough information" });
        return;
    }
    const user = await usersCollection.findOne({ username });
    if (user) {
        res.status(400).json({ message: "This user is already exists." });
        return;
    }
    if (password.length < 6 || password.length > 12) {
        res.status(400).json({ message: "Password must be 6-12 characters" });
        return;
    }
    if (!/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        res.status(400).json({ message: "Password must contain numbers and letters" });
        return;
    }
    if (password !== repassword) {
        res.status(400).json({ message: "Passwords do not match." });
        return;
    }
    if (!emailValidator.validate(email)) {
        res.status(400).json({ message: "Not a valid email" });
        return;
    }
    const emailExists = await usersCollection.findOne({ email });
    if (emailExists) {
        res.status(400).json({ message: "This email already exists" });
        return;
    }
    const date = Date.now() + 86400000; // 24 hours
    let token = makeid(64);
    await tokensCollection.insertOne({ username, token, expDate: date });
    const hash = await bcrypt.hash(password, +process.env.BCRYPT_SALT); // encrypt password before saving
    await usersCollection.insertOne({ username, password: hash, email, rank: "user" });
    res.status(201).json({ message: "User registered successfully.", token });
});

init().then(function () {
    app.listen(port, () => {
        console.log("Server is running on port " + port);
    });
});