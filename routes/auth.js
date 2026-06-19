const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');
const bcrypt = require('bcrypt');

// РЕГИСТРАЦИЯ
router.post('/register', async (req, res) => {
    try {
        const { teamName, email, password, city, school } = req.body;

        const existingTeam = await pool.query(
            'SELECT * FROM users WHERE team_name = $1',
            [teamName]
        );
        if (existingTeam.rows.length > 0) {
            return res.status(400).json({ error: 'Команда уже зарегистрирована' });
        }

        const existingEmail = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Email уже используется' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (team_name, email, password, city, school)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, team_name, email, city, school, points, wins, rating`,
            [teamName, email, hashedPassword, city, school]
        );

        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'Регистрация успешна!',
            token,
            user: {
                id: user.id,
                teamName: user.team_name,
                email: user.email,
                city: user.city,
                school: user.school,
                points: user.points,
                wins: user.wins,
                rating: user.rating
            }
        });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ВХОД
router.post('/login', async (req, res) => {
    try {
        const { teamName, password } = req.body;

        const result = await pool.query(
            'SELECT * FROM users WHERE team_name = $1',
            [teamName]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Команда не найдена' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ error: 'Неверный пароль' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Вход выполнен!',
            token,
            user: {
                id: user.id,
                teamName: user.team_name,
                email: user.email,
                city: user.city,
                school: user.school,
                points: user.points,
                wins: user.wins,
                rating: user.rating
            }
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ПОЛУЧЕНИЕ ПРОФИЛЯ
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Нет токена' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
            'SELECT id, team_name, email, city, school, points, wins, rating, completed_labors, failed_labors, completed_finals FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const user = result.rows[0];
        res.json({
            user: {
                id: user.id,
                teamName: user.team_name,
                email: user.email,
                city: user.city,
                school: user.school,
                points: user.points,
                wins: user.wins,
                rating: user.rating,
                completedLabors: user.completed_labors || [],
                failedLabors: user.failed_labors || [],
                completedFinals: user.completed_finals || []
            }
        });
    } catch (error) {
        console.error('Ошибка профиля:', error);
        res.status(401).json({ error: 'Неверный токен' });
    }
});

// ОБНОВЛЕНИЕ ПРОГРЕССА
router.post('/progress', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Нет токена' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { points, wins, rating, completedLabors, failedLabors, completedFinals } = req.body;

        const result = await pool.query(
            `UPDATE users 
             SET points = $1, wins = $2, rating = $3, 
                 completed_labors = $4, failed_labors = $5, completed_finals = $6
             WHERE id = $7
             RETURNING id, team_name, points, wins, rating, completed_labors, failed_labors, completed_finals`,
            [points, wins, rating, completedLabors || [], failedLabors || [], completedFinals || [], decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const user = result.rows[0];
        res.json({
            message: 'Прогресс обновлён!',
            user: {
                id: user.id,
                teamName: user.team_name,
                points: user.points,
                wins: user.wins,
                rating: user.rating,
                completedLabors: user.completed_labors || [],
                failedLabors: user.failed_labors || [],
                completedFinals: user.completed_finals || []
            }
        });
    } catch (error) {
        console.error('Ошибка обновления прогресса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ТАБЛИЦА ЛИДЕРОВ
router.get('/leaderboard', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT team_name, points, wins, rating
             FROM users 
             WHERE points > 0
             ORDER BY points DESC 
             LIMIT 10`
        );
        res.json({ leaders: result.rows });
    } catch (error) {
        console.error('Ошибка загрузки лидеров:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;