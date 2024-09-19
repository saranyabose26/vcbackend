import Express from "express";
import { db } from "../DB/dbConnection.js";

import bcrypt from "bcrypt";
import Jwt from "jsonwebtoken";

const users = Express.Router();

//Users DB Collection
const userCollection = db.collection(process.env.DB_USERCOLLECTION);

//API to create a new user
users.post("/Create", async (req, res) => {

    try {
        const email = await userCollection.findOne({ email: req.body.email });
        if (email === null) {
            bcrypt.hash(req.body.password, 10, async (err, hash) => {
                if (err) {
                    res.status(500).send({ message: "Internal Server error hash", err })
                } else {
                    const userData = {
                        ...req.body,
                        password: hash,
                        Appointment: [],
                        PreviousHistory: []
                    }
                    await userCollection.insertOne(userData);
                }
            })

            res.send({ message: "Data inserted successfully" })
        } else {
            res.send({ message: "Email Id already exist" });
        }

    } catch (e) {
        res.status(500).send({ message: "Internal Server Error" })
    }
})


//APi to login the user
users.post("/Login", async (req, res) => {
    try {

        const password = await userCollection.findOne({ email: req.body.email }, { projection: { _id: 0, password: 1 } });
        if (password != null) {
            bcrypt.compare(req.body.password, password.password, async (err, result) => {
                if (result) {
                    const payload = {
                        email: req.body.email,
                        UserName: await userCollection.findOne({ email: req.body.email }, { projection: { _id: 0, name: 1 } })
                    }
                    const token = Jwt.sign(payload, process.env.JWT_SECREAT_KEY, {
                        expiresIn: process.env.JWT_EXPIRE
                    })
                    res.send({ message: "Login Successfull", token })
                } else {
                    res.send({ message: "Password incorrect" })
                }
            })
        } else {
            res.send({ message: "User Not found" });
        }

    } catch (e) {
        res.status(500).send({ message: "Internal Server Error" })
    }
})

//API to verify the token in the token when the user login to the home page
users.post("/verifyToken", (req, res) => {
    try {
        Jwt.verify(req.body.token, process.env.JWT_SECREAT_KEY, (async (err, result) => {
            if (err) {
                res.status(500).send({ message: "Internal Server Error", err })
            } else {
                res.send(result)
            }
        }));
    }
    catch (e) {
        res.status(500).send({ message: "Internal Server Error" })
    }
})

//API to add the appoinment details to the previous history
users.put("/addPeviousHistory", async (req, res) => {
    try {
        const data = await userCollection.findOne({ email: req.body.email }, { projection: { _id: 0, Appointment: 1 } });

        const pushPreviousData = data.Appointment.filter((val) => {
            if (val.id == req.body.id) {
                return val
            }
        })
        await userCollection.updateOne({ email: req.body.email }, { $push: { PreviousHistory: pushPreviousData[0] } });

        const filterData = data.Appointment.filter((val) => {
            if (val.id != req.body.id) {
                return val
            }
        })
        await userCollection.updateOne({ email: req.body.email }, { $set: { Appointment: filterData } });

        // await userCollection.updateOne({email:req.body.email},{$push:{PreviousHistory:data.Appointment}});
        // await userCollection.updateOne({email:req.body.email},{$set:{Appointment:{}}})
        res.send({ message: "Data update to previous history" })
    } catch (e) {
        res.status(500).send({ message: "Internal Server Error" })
    }
})

//API to get the previous history record of a specific user
users.get("/PreviousHistory", async (req, res) => {
    try {
        const email = req.headers["email"];
        const data = await userCollection.findOne({ email: email }, { projection: { _id: 0, PreviousHistory: 1 } });
        res.send(data.PreviousHistory)
    } catch (e) {
        res.status(500).send({ message: "Internal Server Error" })
    }
})

export default users;