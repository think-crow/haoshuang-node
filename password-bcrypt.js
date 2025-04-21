const bcrypt = require('bcrypt');

// 假设要加密的密码是 'mySecurePassword123'
const password = '123';

// 加密密码函数
async function encryptPassword(plainPassword) {
  try {
    const saltRounds = 10;  // 盐的轮数
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    console.log('Encrypted Password:', hashedPassword);
    return hashedPassword;
  } catch (err) {
    console.error('Error encrypting password:', err);
  }
}

// 示例：加密密码
encryptPassword(password).then(hashedPassword => {
  // 假设 hashedPassword 是你从环境变量中获取的存储密码
  const inputPassword = '123';  // 用户输入的密码
  
  bcrypt.compare(inputPassword, hashedPassword, (err, isMatch) => {
    if (err) {
      console.error('Error comparing passwords:', err);
    } else if (isMatch) {
      console.log('Password match!');
    } else {
      console.log('Password does not match!');
    }
  });
});
