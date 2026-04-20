import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Firebase Admin Init
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.VITE_FIREBASE_DATABASE_URL
      });
      console.log("Firebase Admin initialized");
    } catch (err) {
      console.error("Firebase Admin Init Error:", err);
    }
  }

  app.use(express.json());

  // Algerian Data
  const algerianStates = [
    "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", "Béchar", 
    "Blida", "Bouira", "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", "Tizi Ouzou", "Alger", 
    "Djelfa", "Jijel", "Sétif", "Saïda", "Skikda", "Sidi Bel Abbès", "Anaba", "Guelma", 
    "Constantine", "Médéa", "Mostaganem", "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh", 
    "Illizi", "Bordj Bou Arreridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt", "El Oued", 
    "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent", 
    "Ghardaïa", "Relizane", "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal", "Béni Abbès", 
    "In Salah", "In Guezzam", "Touggourt", "Djanet", "El M'Ghair", "El Meniaa"
  ];

  // Simulated Email Verification
  const verificationCodes = new Map<string, string>();

  app.get("/api/states", (req, res) => {
    res.json(algerianStates);
  });

  app.post("/api/send-code", (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes.set(email, code);
    
    // In a real app, use Resend or Nodemailer
    console.log(`[VERIFICATION] Code for ${email}: ${code}`);
    
    res.json({ success: true, message: "Code sent (check logs/simulation)" });
  });

  app.post("/api/verify-code", (req, res) => {
    const { email, code } = req.body;
    const stored = verificationCodes.get(email);
    if (stored === code) {
      verificationCodes.delete(email);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Invalid code" });
    }
  });

  // Push Notifications API
  app.post("/api/send-notification", async (req, res) => {
    const { token, title, body, data } = req.body;
    if (!token || !title || !body) return res.status(400).json({ error: "Missing notification fields" });

    try {
      const response = await admin.messaging().send({
        token,
        notification: { title, body },
        data: data || {},
      });
      res.json({ success: true, messageId: response });
    } catch (err) {
      console.error("FCM Send Error:", err);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Real Weather API ( Algerian Wilayas )
  app.get("/api/weather", async (req, res) => {
    const { wilaya } = req.query;
    const apiKey = process.env.VITE_OPENWEATHER_API_KEY;

    if (!wilaya) {
      return res.status(400).json({ error: "Wilaya required" });
    }

    // Normalization for OpenWeather (Removing accents for better search)
    const normalizedWilaya = (wilaya as string)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[']/g, " ");

    if (!apiKey) {
      // Simulation Fallback for Demo without Key
      const temp = 15 + Math.floor(Math.random() * 20);
      const conditions = ["Clear", "Clouds", "Rain", "Windy"];
      return res.json({
        temp,
        humidity: 40 + Math.floor(Math.random() * 40),
        windSpeed: 5 + Math.floor(Math.random() * 25),
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        wilaya: wilaya,
        timestamp: Date.now(),
        isSimulated: true
      });
    }

    try {
      // Searching for wilaya + Algeria
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(normalizedWilaya)},DZ&appid=${apiKey}&units=metric`;
      const response = await axios.get(url);
      const data = response.data;

      res.json({
        temp: Math.round(data.main.temp),
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        condition: data.weather[0].main,
        wilaya: wilaya,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error("Weather Proxy Error:", err);
      // Fallback to simulation even on error to keep UI alive
      res.json({
        temp: 20,
        humidity: 50,
        windSpeed: 10,
        condition: "Clouds",
        wilaya: wilaya,
        timestamp: Date.now(),
        isSimulated: true,
        error: "Provider failed, showing estimate"
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
