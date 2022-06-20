import { tokensCollection, ranksCollection, usersCollection } from './db.js';

export function makeid(length) { // random string generator // https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export async function validateToken(req, res, next) {
    const { token } = req.headers;
    const tokenObj = await tokensCollection.findOne({ token });
    res.locals.token = token;
    if (!tokenObj) {
        next();
    } else {
        const date = new Date(Date.now());
        const expDate = new Date(tokenObj.expDate);
        if (date > expDate) {
            await tokensCollection.deleteOne({ token });
            res.status(400).json({ message: "This token is expired" });
            return;
        }
        next();
    }
}

export async function hasAccess(token, flag) {
    const tokenObj = await tokensCollection.findOne({ token });
    let rank;
    if (!tokenObj) {
        rank = await ranksCollection.findOne({ rank: "guest" });
    } else {
        const user = await usersCollection.findOne({ username: tokenObj.username });
        if(!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        rank = await ranksCollection.findOne({ rank: user.rank });
    }
    return rank.access.includes(flag);
}