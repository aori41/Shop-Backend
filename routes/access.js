import express from 'express';
const route = express.Router();
import { tokensCollection, ranksCollection, usersCollection } from '../db.js';
import { validateToken, hasAccess } from '../utils.js';

const permissions = [
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
];

route.get('/permissions', validateToken, async (req, res) => {
    const token = res.locals.token;
    if (!token) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    }
    const tokenObj = await tokensCollection.findOne({ token });
    const user = await usersCollection.findOne({ username: tokenObj.username });
    const rank = await ranksCollection.findOne({ rank: user.rank });
    if (!rank.access.includes("add.rank") || !rank.access.includes("edit.rank")) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    }
    res.json({
        access: permissions
    });
});

route.get('/ranks', validateToken, async (req, res) => {
    const token = res.locals.token;
    if (!token) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    }
    const tokenObj = await tokensCollection.findOne({ token });
    const user = await usersCollection.findOne({ username: tokenObj.username });
    const rank = await ranksCollection.findOne({ rank: user.rank });
    if (!rank.access.includes("delete.rank") || !rank.access.includes("add.user.access") || !rank.access.includes("edit.user.access") || !rank.access.includes("delete.user.access")) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    }
    res.json({
        ranks: await ranksCollection.find({}).project({ _id: 0 }).toArray()
    })
});

route.get("/admins", validateToken, async (req, res) => {
    const token = res.locals.token;
    const userAccess = await hasAccess(token, "view.admins");
    if (!userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    }
    const rank = req.query.rank;
    if (!rank) {
        res.json({
            users: await usersCollection.find({}).project({ _id: 0, password: 0, email: 0 }).toArray()
        });
    } else {
        res.json({
            admins: await usersCollection.find({ rank }).project({ _id: 0, password: 0, email: 0 }).toArray()
        });
    }
});

route.post('/rank', validateToken, async (req, res) => {
    const token = res.locals.token;
    const { rankName, access } = req.body;
    const userAccess = await hasAccess(token, "add.rank");
    if (!userAccess || !token) {
        res.status(400).json({ message: "This user don't have access" });
        return;
    }
    if (!rankName) {
        res.status(400).json({ message: "Not a valid rank name" });
        return;
    }
    if (!access) {
        res.status(400).json({ message: "No permissions has been chosen" });
        return;
    }
    let rankExists = await ranksCollection.findOne({ rank: rankName });
    if (rankExists) {
        res.status(400).json({ message: "This rank is already exists" });
        return;
    }
    rankExists = await ranksCollection.findOne({ rank: "user" });
    const fullAccess = access.concat(rankExists.access); // add 'user' permissions to the new rank
    await ranksCollection.insertOne({ rank: rankName, access: fullAccess });
    res.status(201).json({ message: "rank " + rankName + " added successfully" });
});

route.patch('/rank', validateToken, async (req, res) => {
    const token = res.locals.token;
    const { rankName, access } = req.body;
    const userAccess = await hasAccess(token, "edit.rank");
    if (!userAccess || !token) {
        res.status(400).json({ message: "This user don't have access" });
        return;
    }
    const rankExists = await ranksCollection.findOne({ rank: rankName });
    if (!rankExists || !rankName) {
        res.status(404).json({ message: "Rank is not exist" });
        return;
    }
    if (!access) {
        res.status(400).json({ message: "No permissions has been chosen" });
        return;
    }
    await ranksCollection.updateOne({ rank: rankName }, { "$set": { access } });
    res.json({ message: "rank " + rankName + " has been modifed successfully" });
});

route.delete('/rank', validateToken, async (req, res) => {
    const token = res.locals.token;
    const { rankName } = req.body;
    const userAccess = await hasAccess(token, "delete.rank");
    if (!userAccess || !token) {
        res.status(400).json({ message: "This user don't have access" });
        return;
    }
    const rankExists = await ranksCollection.findOne({ rank: rankName });
    if (!rankExists || !rankName) {
        res.status(404).json({ message: "Rank is not exist" });
        return;
    }
    await ranksCollection.deleteOne({ rank: rankName });
    await usersCollection.updateMany({ rank: rankName }, { "$set": { rank: "user" } });
    res.json({ message: "rank " + rankName + " has been deleted successfully" });
});

route.post("/access", validateToken, async (req, res) => {
    const token = res.locals.token;
    const { adminName, rankName } = req.body;
    const userAccess = await hasAccess(token, "add.user.access");
    if (!userAccess || !token) {
        res.status(400).json({ message: "This user don't have access" });
        return;
    }
    const userExists = await usersCollection.findOne({ username: adminName });
    if (!userExists || !adminName) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    const rankExists = await ranksCollection.findOne({ rank: rankName });
    if (!rankExists || !rankName) {
        res.status(400).json({ message: "Not a valid rank name" });
        return;
    }
    if (userExists.rank === "user") {
        await usersCollection.updateOne({ username: adminName }, { "$set": { rank: rankName } });
        res.status(201).json({ message: adminName + " added to the admin list as a " + rankName });
    } else {
        res.status(400).json({ message: "This user already have rank" });
    }
});

route.patch("/access", validateToken, async (req, res) => {
    const token = res.locals.token;
    const { adminName, rankName } = req.body;
    const userAccess = await hasAccess(token, "edit.user.access");
    if (!userAccess || !token) {
        res.status(400).json({ message: "This user don't have access" });
        return;
    }
    const userExists = await usersCollection.findOne({ username: adminName });
    if (!userExists || !adminName) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    const rankExists = await ranksCollection.findOne({ rank: rankName });
    if (!rankExists || !rankName) {
        res.status(400).json({ message: "Not a valid rank name" });
        return;
    }
    if (userExists.rank !== "user") {
        await usersCollection.updateOne({ username: adminName }, { "$set": { rank: rankName } });
        res.json({ message: adminName + " access set to " + rankName });
    } else {
        res.status(400).json({ message: "This user don't have rank" });
    }
});

route.delete("/access", validateToken, async (req, res) => {
    const token = res.locals.token;
    const { adminName } = req.body;
    const userAccess = await hasAccess(token, "remove.user.access");
    if (!userAccess || !token) {
        res.status(400).json({ message: "This user don't have access" });
        return;
    }
    const userExists = await usersCollection.findOne({ username: adminName });
    if (!userExists || !adminName) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    if (userExists.rank !== "user") {
        await usersCollection.updateOne({ username: adminName }, { "$set": { rank: "user" } });
        res.json({ message: adminName + " removed from the admin list" });
    } else {
        res.status(400).json({ message: "This user don't have a rank" });
    }
});

route.delete("/user", validateToken, async (req, res) => {
    const token = res.locals.token;
    const { username } = req.body;
    const userAccess = await hasAccess(token, "delete.user");
    if (!userAccess || !token) {
        res.status(400).json({ message: "This user don't have access" });
        return;
    }
    const userExists = await usersCollection.findOne({ username });
    if (!userExists || !username) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    await usersCollection.deleteOne({ username });
    res.json({ message: username + " has been deleted successfully" });
});

export default route;