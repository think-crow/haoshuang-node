const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const path = require('path');

// 允许的 JSON 文件名（白名单控制）
const allowedFiles = ['poetrys', 'notepapers'];

const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';
const dataDir = process.env.JSON_DATA_DIR || path.join(__dirname, '../../static');

// JWT 验证函数（返回 Promise）
const verifyJWT = (req) => {
  return new Promise((resolve, reject) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return reject({ status: 403, message: 'Access denied, no token provided' });

    jwt.verify(token, secretKey, (err, user) => {
      if (err) return reject({ status: 403, message: 'Token is not valid' });
      resolve(user);
    });
  });
};

// 示例数据校验（这里只是简单判断是否为对象，可接入 zod/joi）
const validateData = (data) => {
  return typeof data === 'object' && !Array.isArray(data);
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { fileName } = req.query;
  const newData = req.body;

  if (!fileName || !allowedFiles.includes(fileName)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing fileName' });
  }

  if (!validateData(newData)) {
    return res.status(400).json({ success: false, message: 'Invalid data format' });
  }

  try {
    const user = await verifyJWT(req);
    req.user = user; // 可选：用于记录是谁写入数据的

    const jsonFilePath = path.join(dataDir, `${fileName}.json`);

    // 检查文件是否存在
    try {
      await fs.access(jsonFilePath);
    } catch {
      return res.status(404).json({ success: false, message: `File ${fileName}.json not found` });
    }

    // 读取现有数据
    const raw = await fs.readFile(jsonFilePath, 'utf8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      return res.status(500).json({ success: false, message: 'Invalid JSON structure in file' });
    }

    // 添加数据
    data.push(newData);

    // 写入文件（覆盖）
    await fs.writeFile(jsonFilePath, JSON.stringify(data, null, 2), 'utf8');

    return res.status(201).json({
      success: true,
      data: newData,
      message: 'Data appended successfully',
    });
  } catch (err) {
    console.error('[ERROR]', err);
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    return res.status(status).json({ success: false, message });
  }
};
