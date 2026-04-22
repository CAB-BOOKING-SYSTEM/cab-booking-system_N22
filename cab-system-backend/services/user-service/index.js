const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Cấu hình kết nối PostgreSQL
// Thay thế đoạn cấu hình cũ bằng đoạn này
const pool = new Pool({
    connectionString: process.env.DB_URL || 'postgresql://postgres:postgres@localhost:5432/cab_users',
});

// --- UTILS: MASKING DỮ LIỆU NHẠY CẢM ---
const maskPhoneNumber = (phone) => {
    if (!phone) return null;
    return phone.slice(0, 3) + '****' + phone.slice(-3); // VD: 090****789
};

const maskEmail = (email) => {
    if (!email) return null;
    const [name, domain] = email.split('@');
    return name[0] + '***@' + domain; // VD: d***@gmail.com
};

// --- API 1: TẠO MỚI USER (Đăng ký cơ bản) ---
app.post('/api/v1/users', async (req, res) => {
    try {
        const { full_name, phone_number, email, role } = req.body;
        const result = await pool.query(
            'INSERT INTO users (full_name, phone_number, email, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, status',
            [full_name, phone_number, email, role || 'CUSTOMER']
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- API 2: XEM PROFILE (Có Masking dữ liệu) ---
app.get('/api/v1/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Giả lập: Nếu người gọi là Admin (check qua header/token) thì không mask, ở đây mặc định là mask
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let user = result.rows[0];
        // Áp dụng Masking
        user.phone_number = maskPhoneNumber(user.phone_number);
        user.email = maskEmail(user.email);

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- API 2B: CẬP NHẬT PROFILE USER ---
app.patch('/api/v1/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email } = req.body;
        
        // Lấy dữ liệu cũ trước
        const oldResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (oldResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const oldUser = oldResult.rows[0];
        
        // Cập nhật dữ liệu mới
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (full_name !== undefined) {
            updateFields.push(`full_name = $${paramIndex}`);
            updateValues.push(full_name);
            paramIndex++;
        }
        
        if (email !== undefined) {
            updateFields.push(`email = $${paramIndex}`);
            updateValues.push(email);
            paramIndex++;
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }
        
        updateValues.push(id);
        const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        
        const result = await pool.query(query, updateValues);
        const newUser = result.rows[0];
        
        res.json({ 
            success: true, 
            data: newUser,
            audit: {
                previousValues: { full_name: oldUser.full_name, email: oldUser.email },
                newValues: { full_name: newUser.full_name, email: newUser.email }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- API 3: QUẢN LÝ ĐỊA ĐIỂM (Saved Locations) ---
app.post('/api/v1/users/:id/locations', async (req, res) => {
    try {
        const { id } = req.params;
        const { label, address, lat, lng } = req.body;
        const result = await pool.query(
            'INSERT INTO saved_locations (user_id, label, address, lat, lng) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, label, address, lat, lng]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- API 3B: LẤY DANH SÁCH ĐỊA ĐIỂM CỦA USER ---
app.get('/api/v1/users/:id/locations', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM saved_locations WHERE user_id = $1 ORDER BY created_at DESC',
            [id]
        );
        res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- API 3C: XÓA ĐỊA ĐIỂM ĐÃ LƯU ---
app.delete('/api/v1/users/:id/locations/:locationId', async (req, res) => {
    try {
        const { id, locationId } = req.params;
        const result = await pool.query(
            'DELETE FROM saved_locations WHERE id = $1 AND user_id = $2 RETURNING *',
            [locationId, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Location not found' });
        }
        
        res.json({ success: true, message: 'Location deleted', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- API 5: BAN/UNBAN USER ACCOUNT ---
app.patch('/api/v1/users/:id/ban', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason, reasonDescription } = req.body;
        
        // Validate: status phải là BANNED hoặc ACTIVE
        if (!['BANNED', 'ACTIVE'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Only BANNED or ACTIVE allowed' });
        }
        
        // Lấy dữ liệu cũ
        const oldResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (oldResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const oldUser = oldResult.rows[0];
        
        // Cập nhật status
        const result = await pool.query(
            'UPDATE users SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        
        const newUser = result.rows[0];
        
        // Phát event qua RabbitMQ (nếu ban)
        if (status === 'BANNED') {
            const event = {
                eventId: `evt_${Date.now()}_${Math.random()}`,
                eventName: 'user.account_banned',
                timestamp: new Date().toISOString(),
                sourceService: 'user-service',
                sourceVersion: '1.0.0',
                schemaVersion: '1',
                userId: id,
                data: {
                    userId: id,
                    phoneNumber: newUser.phone_number,
                    fullName: newUser.full_name,
                    email: newUser.email,
                    role: newUser.role,
                    banReason: reason || 'ADMIN_ACTION',
                    banReasonDescription: reasonDescription || 'Tài khoản đã bị khóa bởi quản trị viên',
                    bannedAt: new Date().toISOString(),
                    bannedBy: 'admin_system',
                    banDuration: 'PERMANENT',
                    banExpiryDate: null,
                    previousStatus: oldUser.status,
                    newStatus: status,
                    notificationSent: false,
                    ipAddress: req.ip
                }
            };
            
            console.log('Event user.account_banned (to be sent to RabbitMQ):', event);
            // TODO: Integrate RabbitMQ to publish this event
        }
        
        res.json({ 
            success: true, 
            data: newUser,
            message: status === 'BANNED' ? 'User account banned' : 'User account restored'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- API 4: ADMIN LẤY DANH SÁCH USER (Pagination & Filtering) ---
app.get('/api/v1/users', async (req, res) => {
    try {
        // Lấy query params với giá trị mặc định
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status; // Filter theo status
        const role = req.query.role;     // Filter theo role
        
        const offset = (page - 1) * limit;

        // Xây dựng câu query động
        let query = 'SELECT id, full_name, phone_number, email, role, status, created_at FROM users WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
        const queryParams = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND status = $${paramIndex}`;
            countQuery += ` AND status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }

        if (role) {
            query += ` AND role = $${paramIndex}`;
            countQuery += ` AND role = $${paramIndex}`;
            queryParams.push(role);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);

        const [usersResult, countResult] = await Promise.all([
            pool.query(query, queryParams),
            pool.query(countQuery, queryParams.slice(0, -2)) // Bỏ limit và offset cho count
        ]);

        const totalItems = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalItems / limit);

        res.json({
            success: true,
            data: usersResult.rows,
            pagination: {
                total_items: totalItems,
                total_pages: totalPages,
                current_page: page,
                limit: limit
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`User Service is running on port ${PORT}`);
});