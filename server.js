const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");

const app = express();

const PORT = 5000;
const MONGODB_URI = "mongodb://127.0.0.1:27017";
const DB_NAME = "fir_management";

const client = new MongoClient(MONGODB_URI);

app.use(cors());
app.use(express.json());

let db;

// ================================
// ROOT
// ================================

app.get("/api", async (req, res) => {    res.json({
        message: "FIR Management System Backend is running",
        mongodb: db ? "Connected" : "Disconnected"
    });
});

// ================================
// MONGODB TEST
// ================================

app.get("/api/test", async (req, res) => {
    try {
        const result = await db.command({ ping: 1 });

        res.json({
            success: true,
            message: "Backend connected to MongoDB",
            mongodb: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ================================
// GET USERS
// ================================

app.get("/api/users", async (req, res) => {
    try {
        const users = await db
            .collection("users")
            .find({})
            .toArray();

        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ================================
// GET POLICE
// ================================

app.get("/api/police", async (req, res) => {
    try {
        const police = await db
            .collection("police")
            .find({})
            .toArray();

        res.json({
            success: true,
            count: police.length,
            data: police
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ================================
// GET PEOPLE
// ================================

app.get("/api/people", async (req, res) => {
    try {
        const people = await db
            .collection("people")
            .find({})
            .toArray();

        res.json({
            success: true,
            count: people.length,
            data: people
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ================================
// GET FIRS
// ================================

app.get("/api/firs", async (req, res) => {
    try {
        const firs = await db
            .collection("firs")
            .find({})
            .toArray();

        res.json({
            success: true,
            count: firs.length,
            data: firs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ================================
// GET ACTIVITY LOGS
// ================================

app.get("/api/activity-logs", async (req, res) => {
    try {
        const logs = await db
            .collection("activityLogs")
            .find({})
            .toArray();

        res.json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ================================
// CREATE FIR
// ================================

app.post("/api/firs", async (req, res) => {
    try {
        const fir = req.body;
        
        if (!fir || !fir.number || !fir.caseType || !fir.station || !fir.officerId) {
            return res.status(400).json({
                success: false,
                message: "Required fields missing: number, caseType, station, officerId"
            });
        }

        // Generate custom id (FIR-XXXX) by finding max existing
        const existingFirs = await db.collection("firs").find({ id: { $regex: /^FIR-\d+$/ } }).project({ id: 1 }).toArray();
        let maxNum = 0;
        existingFirs.forEach(f => {
            const n = parseInt(f.id.replace('FIR-', ''), 10);
            if (n > maxNum) maxNum = n;
        });
        fir.id = 'FIR-' + String(maxNum + 1).padStart(4, '0');

        fir.createdAt = new Date().toISOString();
        fir.updatedAt = new Date().toISOString();
        
        if (!fir.timeline || !Array.isArray(fir.timeline)) {
            fir.timeline = [];
        }

        const result = await db.collection("firs").insertOne(fir);
        
        res.status(201).json({
            success: true,
            message: "FIR created successfully",
            data: { ...fir, _id: result.insertedId }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ================================
// UPDATE FIR
// ================================

app.put("/api/firs/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "FIR ID is required"
            });
        }

        // Try to parse as ObjectId, fallback to custom id field
        let objectId;
        try {
            objectId = new ObjectId(id);
        } catch (e) {
            // If not a valid ObjectId, try custom id field
            objectId = null;
        }

        updateData.updatedAt = new Date().toISOString();
        
        // Build query - try ObjectId first, then custom id field
        const query = objectId ? { _id: objectId } : { id: id };
        
        // If status is being updated, add to timeline
        if (updateData.status || updateData.description) {
            const existingFir = await db.collection("firs").findOne(query);
            if (existingFir) {
                const timelineEntry = {
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toTimeString().slice(0, 5),
                    officerId: updateData.officerId || existingFir.officerId,
                    officerName: updateData.officerName || existingFir.officerName || 'Unknown',
                    status: updateData.status || existingFir.status,
                    description: updateData.description || 'Case details updated.'
                };
                updateData.timeline = [...(existingFir.timeline || []), timelineEntry];
            }
        }

        const result = await db.collection("firs").findOneAndUpdate(
            query,
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "FIR not found"
            });
        }

        res.json({
            success: true,
            message: "FIR updated successfully",
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ================================
// LOGIN
// ================================

app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        const user = await db.collection("users").findOne({
            username: username,
            password: password
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        const { password: _, ...safeUser } = user;

        res.json({
            success: true,
            message: "Login successful",
            user: safeUser
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ================================
// START SERVER
// ================================

async function startServer() {
    try {
        await client.connect();

        db = client.db(DB_NAME);

        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(
                `Backend running at http://localhost:${PORT}`
            );
        });

    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}

startServer();