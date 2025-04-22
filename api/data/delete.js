const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';
const jsonDataDir = process.env.JSON_DATA_DIR || path.join(__dirname, '../../static');

// 可允许操作的文件名（防止路径遍历）
const allowedFiles = ['poetrys', 'notepapers'];

const authenticateJWT = (req) => {
  return new Promise((resolve, reject) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return reject({ status: 403, message: 'No token provided' });

    jwt.verify(token, secretKey, (err, user) => {
      if (err) return reject({ status: 403, message: 'Invalid token' });
      resolve(user);
    });
  });
};

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { _id, fileName } = req.query;

  // 参数校验
  if (!_id || !fileName) {
    return res.status(400).json({ success: false, message: '_id and fileName are required' });
  }

  if (!allowedFiles.includes(fileName)) {
    return res.status(400).json({ success: false, message: 'Invalid fileName' });
  }

  try {
    // 验证身份
    await authenticateJWT(req);

    const filePath = path.join(jsonDataDir, `${fileName}.json`);

    // 读取文件
    let raw;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ success: false, message: 'File not found' });
      }
      throw err;
    }

    // 解析数据
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid JSON structure' });
    }

    if (!Array.isArray(data)) {
      return res.status(500).json({ success: false, message: 'Expected JSON array in file' });
    }

    // 查找并删除数据项
    const index = data.findIndex(item => String(item._id) === String(_id));
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const deletedItem = data.splice(index, 1)[0];

    // 写回数据
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

    return res.status(200).json({
      success: true,
      message: 'Item deleted successfully',
      data: deletedItem
    });
  } catch (err) {
    console.error('[DELETE ERROR]', err);
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    return res.status(status).json({ success: false, message });
  }
};
