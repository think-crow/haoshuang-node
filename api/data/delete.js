const jwt = require('jsonwebtoken');
const fs = require('fs').promises;  // 使用 Promise API
const path = require('path');

const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';
const jsonDataDir = process.env.JSON_DATA_DIR || path.join(__dirname, '../../static');

const authenticateJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'No token provided' });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  authenticateJWT(req, res, async () => {
    const { _id, fileName } = req.query;
    if (!_id || !fileName) {
      return res.status(400).json({ message: '_id and fileName are required' });
    }

    // 校验 fileName 合法性
    if (!/^[a-zA-Z0-9_-]+$/.test(fileName)) {
      return res.status(400).json({ message: 'Invalid fileName' });
    }

    const filePath = path.join(jsonDataDir, `${fileName}.json`);

    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContent);

      const index = data.findIndex(item => String(item._id) === String(_id));
      if (index === -1) {
        return res.status(404).json({ message: 'Data not found' });
      }

      const deletedItem = data.splice(index, 1);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));

      res.status(200).json({
        message: 'Data deleted successfully',
        deletedItem: deletedItem[0]
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ message: 'File not found' });
      }
      if (err instanceof SyntaxError) {
        return res.status(400).json({ message: 'Invalid JSON file' });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
};