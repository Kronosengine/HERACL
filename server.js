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
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

app.use('/api/auth', require('./routes/auth'));

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

process.on('uncaughtException', (err) => {
    console.error('❌ Необработанная ошибка:', err.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Необработанный rejection:', reason);
});