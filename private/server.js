require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Endpoint do wysyłania e-maili
app.post("/send", async (req, res) => {
    const { name, email, message } = req.body;

    const transporter = nodemailer.createTransport({
        host: "mail.healyfit.pl",  // Zamień na host SMTP swojego dostawcy
        port: 465,                 // 465 (SSL) lub 587 (TLS)
        secure: true,              // Używaj `true` dla 465, `false` dla 587
        auth: {
            user: process.env.EMAIL_USER, // Zmienna środowiskowa
            pass: process.env.EMAIL_PASS  // Zmienna środowiskowa
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
app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});
