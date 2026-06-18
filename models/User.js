const pool = require('../db');
const bcrypt = require('bcrypt');

class User {
    static async findByTeamName(teamName) {
        const result = await pool.query(
            'SELECT * FROM users WHERE team_name = $1',
            [teamName]
        );
        return result.rows[0] || null;
    }

    static async findByEmail(email) {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    static async findById(id) {
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    static async create(userData) {
        const { teamName, email, password, city, school } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            `INSERT INTO users (team_name, email, password, city, school)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [teamName, email, hashedPassword, city, school]
        );
        
        return result.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let index = 1;

        if (data.points !== undefined) {
            fields.push(`points = $${index}`);
            values.push(data.points);
            index++;
        }
        if (data.wins !== undefined) {
            fields.push(`wins = $${index}`);
            values.push(data.wins);
            index++;
        }
        if (data.rating !== undefined) {
            fields.push(`rating = $${index}`);
            values.push(data.rating);
            index++;
        }
        if (data.completed_labors !== undefined) {
            fields.push(`completed_labors = $${index}`);
            values.push(data.completed_labors);
            index++;
        }
        if (data.failed_labors !== undefined) {
            fields.push(`failed_labors = $${index}`);
            values.push(data.failed_labors);
            index++;
        }
        if (data.completed_finals !== undefined) {
            fields.push(`completed_finals = $${index}`);
            values.push(data.completed_finals);
            index++;
        }

        if (fields.length === 0) return null;

        values.push(id);
        const query = `
            UPDATE users 
            SET ${fields.join(', ')} 
            WHERE id = $${index}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    static async getLeaderboard(limit = 10) {
        const result = await pool.query(
            `SELECT team_name, points, wins, rating 
             FROM users 
             ORDER BY points DESC 
             LIMIT $1`,
            [limit]
        );
        return result.rows;
    }
}

module.exports = User;