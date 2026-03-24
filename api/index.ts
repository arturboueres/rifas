import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Supabase Client for backend
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Email Transporter Helper
const getTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Amplopay API Endpoint
app.post("/api/pix/receive", async (req, res) => {
  try {
    const { amount, description, external_id, payer_name, payer_email, payer_cpf, payer_phone } = req.body;

    if (!process.env.AMPLOPAY_CLIENT_ID || !process.env.AMPLOPAY_CLIENT_SECRET) {
      const missing = [];
      if (!process.env.AMPLOPAY_CLIENT_ID) missing.push("AMPLOPAY_CLIENT_ID");
      if (!process.env.AMPLOPAY_CLIENT_SECRET) missing.push("AMPLOPAY_CLIENT_SECRET");
      console.error(`Missing Amplopay API credentials: ${missing.join(", ")}`);
      return res.status(500).json({ error: "Configuração da API incompleta.", missing });
    }

    // Ensure amount is a number
    const numericAmount = parseFloat(amount);

    // Tomorrow's date for dueDate
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().split('T')[0];

    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const callbackUrl = `${appUrl}/api/pix/callback`;

    const baseUrl = process.env.AMPLOPAY_BASE_URL || "https://app.amplopay.com/api/v1/gateway/pix/receive";
    console.log("Generating PIX for:", payer_email, "Amount:", numericAmount);
    console.log("Using Base URL:", baseUrl);

    const payload = {
      identifier: external_id,
      amount: numericAmount,
      client: {
        name: payer_name,
        email: payer_email,
        phone: payer_phone,
        document: payer_cpf
      },
      products: [
        {
          id: "rifa_carnes_001",
          name: description,
          quantity: 1,
          price: numericAmount
        }
      ],
      dueDate: dueDate,
      callbackUrl: callbackUrl // This tells Amplopay where to send the payment confirmation
    };

    console.log("Sending payload to Amplopay with callbackUrl:", callbackUrl);
    console.log("Headers check:", {
      "x-public-key": process.env.AMPLOPAY_CLIENT_ID ? "SET (starts with " + process.env.AMPLOPAY_CLIENT_ID.substring(0, 4) + ")" : "MISSING",
      "x-secret-key": process.env.AMPLOPAY_CLIENT_SECRET ? "SET (starts with " + process.env.AMPLOPAY_CLIENT_SECRET.substring(0, 4) + ")" : "MISSING"
    });

    const response = await axios.post(
      baseUrl,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-public-key": process.env.AMPLOPAY_CLIENT_ID,
          "x-secret-key": process.env.AMPLOPAY_CLIENT_SECRET
        }
      }
    );

    console.log("Amplopay Response:", response.data);
    res.json(response.data);
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error("Amplopay Error Detail:", JSON.stringify(errorData, null, 2));
    res.status(500).json({ 
      error: "Failed to generate PIX", 
      details: errorData 
    });
  }
});

// Webhook handler for Amplopay payment confirmations
app.post("/api/pix/callback", async (req, res) => {
  try {
    const { transactionId, status, amount, client } = req.body;
    
    console.log(`[WEBHOOK] Received update for transaction ${transactionId}: ${status}`);

    if (status === "OK") {
      // Update Supabase if configured
      if (supabase) {
        console.log(`[SUPABASE] Updating order ${transactionId} to paid...`);
        const { error: supabaseError } = await supabase
          .from('raffle_orders')
          .update({ status: 'paid' })
          .eq('external_id', transactionId);
        
        if (supabaseError) {
          console.error("[SUPABASE ERROR]:", supabaseError);
        }
      }

      // Here is where the email sending logic lives
      console.log(`[EMAIL] Payment confirmed for ${client.email}. Sending raffle numbers...`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[WEBHOOK ERROR]:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Vite middleware for development (only if not on Vercel)
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else if (!process.env.VERCEL) {
  // Static serving for local production build (not needed on Vercel)
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Only listen if not running on Vercel (which handles the server internally)
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
