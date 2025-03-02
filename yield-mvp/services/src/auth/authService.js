const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  constructor() {
    this.users = new Map();
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  }

  async register(email, password) {
    if (this.users.has(email)) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const user = {
      id: userId,
      email,
      password: hashedPassword,
      portfolio: [],
      createdAt: new Date().toISOString(),
    };

    this.users.set(email, user);
    return this.generateToken(user);
  }

  async login(email, password) {
    const user = this.users.get(email);
    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    return this.generateToken(user);
  }

  generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
    };

    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: '24h' });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async updatePortfolio(userId, portfolio) {
    let userFound = false;
    for (const user of this.users.values()) {
      if (user.id === userId) {
        user.portfolio = portfolio;
        userFound = true;
        break;
      }
    }

    if (!userFound) {
      throw new Error('User not found');
    }
  }

  async getPortfolio(userId) {
    for (const user of this.users.values()) {
      if (user.id === userId) {
        return user.portfolio;
      }
    }
    throw new Error('User not found');
  }
}

module.exports = new AuthService();
