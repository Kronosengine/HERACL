function getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Подключаем роуты
app.use('/api/auth', require('./routes/auth'));

// Проверка подключения к БД
app.get('/api/test-db', async (req, res) => {
    try {
        const pool = require('./db');
        const result = await pool.query('SELECT NOW()');
        res.json({ message: '✅ База данных работает!', time: result.rows[0].now });
    } catch (error) {
        res.status(500).json({ error: '❌ Ошибка подключения к БД', details: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен!`);
    console.log(`📱 Локально: http://localhost:${PORT}`);
});