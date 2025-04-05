require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");
const https = require('https'); // Używamy wbudowanego modułu https zamiast axios

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Funkcja do weryfikacji tokenu Turnstile bez użycia axios
function verifyTurnstileToken(token) {
    return new Promise((resolve, reject) => {
        const data = new URLSearchParams({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: token
        }).toString();
        
        const options = {
            hostname: 'challenges.cloudflare.com',
            path: '/turnstile/v0/siteverify',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': data.length
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve(parsedData);
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

// Endpoint do wysyłania e-maili
app.post("/send", async (req, res) => {
    const { name, email, message, turnstileToken } = req.body;

    // Weryfikacja tokenu Turnstile
    try {
        // Jeśli token nie został przekazany
        if (!turnstileToken) {
            return res.status(400).json({ success: false, message: "Brak weryfikacji CAPTCHA" });
        }

        // Weryfikacja tokenu z Cloudflare
        const verificationResponse = await verifyTurnstileToken(turnstileToken);

        // Sprawdź odpowiedź weryfikacji
        if (!verificationResponse.success) {
            return res.status(400).json({ 
                success: false, 
                message: "Weryfikacja CAPTCHA nie powiodła się" 
            });
        }

    } catch (error) {
        console.error("Błąd weryfikacji Turnstile:", error);
        return res.status(500).json({
            success: false,
            message: "Błąd podczas weryfikacji CAPTCHA"
        });
    }

    const transporter = nodemailer.createTransport({
        host: "mail.healyfit.pl",
        port: 465,
        secure: true,              
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    try {
        await transporter.sendMail({
            from: `"${name}" <${email}>`,
            to: "kontakt@healyfit.pl",
            subject: "Nowa wiadomość z formularza",
            html: `<p><strong>Imię:</strong> ${name}</p>
                   <p><strong>Email:</strong> ${email}</p>
                   <p><strong>Wiadomość:</strong> ${message}</p>`
        });
        res.json({ success: true, message: "E-mail wysłany!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Błąd podczas wysyłania", error });
    }
});

// Start serwera
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serwer działa na :${PORT}`);
});