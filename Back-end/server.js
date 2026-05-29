// Back-end/server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const SECRET_KEY = 'my_secret_key'; 

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Giả lập check database
    if (username === 'admin' && password === '123') {
        // Tạo token chứa role để bảo mật
        const token = jwt.sign({ username: 'admin', role: 'Admin' }, SECRET_KEY, { expiresIn: '1h' });
        return res.json({ token });
    }
    
    res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
});

app.listen(5000, () => console.log("Server đang chạy tại http://localhost:5000"));