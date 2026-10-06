const fs = require("fs");
const vm = require("vm");
const { MongoClient } = require("mongodb");

const MONGODB_URI = "mongodb://127.0.0.1:27017";
const DB_NAME = "fir_management";

const DATA_FILE = "../assets/fir-data.js";

async function seedDatabase() {
    const client = new MongoClient(MONGODB_URI);

    try {
        console.log("Reading fir-data.js...");

        const code = fs.readFileSync(DATA_FILE, "utf8");

        const context = {
            window: {}
        };

        vm.runInNewContext(code, context);

        const seed = context.window.FIR_SEED;

        if (!seed) {
            throw new Error("FIR_SEED was not found in fir-data.js");
        }

        console.log("Seed data loaded successfully!");

        await client.connect();

        console.log("MongoDB connected successfully!");

        const db = client.db(DB_NAME);

        const collections = {
            users: db.collection("users"),
            police: db.collection("police"),
            people: db.collection("people"),
            firs: db.collection("firs"),
            activityLogs: db.collection("activityLogs")
        };

        const users = [
            {
                id: "USR-0001",
                username: "admin",
                password: "admin123",
                role: "ADMIN",
                refId: null,
                name: "Chief Admin Davies"
            }
        ];

        if (Array.isArray(seed.police)) {
            for (const police of seed.police) {
                users.push({
                    id: `USR-${police.id}`,
                    username: police.username,
                    password: police.password,
                    role: "POLICE",
                    refId: police.id,
                    name: police.name
                });
            }
        }

        if (Array.isArray(seed.people)) {
            for (const person of seed.people) {
                users.push({
                    id: `USR-${person.id}`,
                    username: person.username,
                    password: person.password,
                    role: "PEOPLE",
                    refId: person.id,
                    name: person.name
                });
            }
        }

        await collections.users.deleteMany({});
        await collections.police.deleteMany({});
        await collections.people.deleteMany({});
        await collections.firs.deleteMany({});
        await collections.activityLogs.deleteMany({});

        console.log("Existing MongoDB seed data cleared.");

        if (users.length > 0) {
            await collections.users.insertMany(users);
        }

        if (Array.isArray(seed.police) && seed.police.length > 0) {
            await collections.police.insertMany(seed.police);
        }

        if (Array.isArray(seed.people) && seed.people.length > 0) {
            await collections.people.insertMany(seed.people);
        }

        if (Array.isArray(seed.firs) && seed.firs.length > 0) {
            await collections.firs.insertMany(seed.firs);
        }

        if (
            Array.isArray(seed.activityLogs) &&
            seed.activityLogs.length > 0
        ) {
            await collections.activityLogs.insertMany(seed.activityLogs);
        }

        console.log("");
        console.log("========================================");
        console.log("FIR DATABASE SEED COMPLETE");
        console.log("========================================");
        console.log(`Users:        ${users.length}`);
        console.log(`Police:       ${seed.police?.length || 0}`);
        console.log(`People:       ${seed.people?.length || 0}`);
        console.log(`FIRs:         ${seed.firs?.length || 0}`);
        console.log(`Activity:     ${seed.activityLogs?.length || 0}`);
        console.log("========================================");

    } catch (error) {
        console.error("");
        console.error("SEEDING FAILED");
        console.error(error);
        process.exitCode = 1;

    } finally {
        await client.close();
    }
}

seedDatabase();