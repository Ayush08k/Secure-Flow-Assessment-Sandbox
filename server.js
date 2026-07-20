import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Read JWT secret from environment. In dev mode, auto-generates a random one per session.
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn('[SECURITY] No JWT_SECRET in env — using auto-generated ephemeral secret (tokens invalidate on restart).');
}

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory Database
const users = [];
const files = [];

// Security: Restrict CORS to the Vite dev server origin
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Security: Limit JSON body size to prevent payload DoS attacks
app.use(express.json({ limit: '16kb' }));

// Security: Global security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Serve uploaded files statically with custom auth check
// We don't expose 'uploads/' folder directly via express.static to enforce authorization check!

// Rate Limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 signup/login requests per minute
  message: { error: 'Too many authentication attempts. Please wait 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 uploads per minute
  message: { error: 'Upload limit exceeded. Please wait 1 minute before uploading again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', globalLimiter);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---

// Check if admin exists
app.get('/api/auth/admin-exists', (req, res) => {
  const hasAdmin = users.some(u => u.role === 'admin');
  res.json({ exists: hasAdmin });
});

// Signup
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const { username, password, confirmPassword, email, role } = req.body;

  // --- Input Presence Validation ---
  if (!username || !password || !confirmPassword || !email) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // --- Input Type Validation ---
  if (typeof username !== 'string' || typeof password !== 'string' || typeof confirmPassword !== 'string' || typeof email !== 'string') {
    return res.status(400).json({ error: 'Invalid input types.' });
  }

  // --- Password Matching ---
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  // --- Boundary Value: Username (3-30 chars, alphanumeric + underscore) ---
  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }
  if (trimmedUsername.length > 30) {
    return res.status(400).json({ error: 'Username must not exceed 30 characters.' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
    return res.status(400).json({ error: 'Username may only contain letters, numbers, and underscores.' });
  }

  // --- Boundary Value: Email (format + max 254 chars per RFC 5321) ---
  const trimmedEmail = email.trim().toLowerCase();
  if (trimmedEmail.length > 254) {
    return res.status(400).json({ error: 'Email address is too long.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  // --- Boundary Value: Password (6-72 chars; bcrypt silently truncates at 72) ---
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (password.length > 72) {
    return res.status(400).json({ error: 'Password must not exceed 72 characters.' });
  }

  // --- Password Complexity: must contain uppercase, lowercase, digit, and special character ---
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one uppercase letter.' });
  }
  if (!/[a-z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one lowercase letter.' });
  }
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one number.' });
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one special character (!@#$%^&* etc.).' });
  }

  const userExists = users.find(u => u.username.toLowerCase() === trimmedUsername.toLowerCase() || u.email.toLowerCase() === trimmedEmail);
  if (userExists) {
    return res.status(409).json({ error: 'Username or email already exists.' });
  }

  try {
    const hasAdmin = users.some(u => u.role === 'admin');
    const assignedRole = (role === 'admin' && !hasAdmin) ? 'admin' : 'user';

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: crypto.randomUUID(),
      username: trimmedUsername,
      email: trimmedEmail,
      password: hashedPassword,
      role: assignedRole
    };
    users.push(newUser);
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

// Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // --- Input Type Validation ---
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input types.' });
  }

  // --- Boundary: Reject absurdly long inputs early (DoS prevention) ---
  if (username.length > 30 || password.length > 72) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) {
    // Constant-time delay to prevent user enumeration timing attacks
    await bcrypt.compare(password, '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345');
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  try {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Me Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  });
});

// --- FILE UPLOAD ROUTES ---

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique name with UUID to prevent collision and cache leaks
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Reject executable files
  const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only standard document/image formats (jpeg, png, pdf, doc, txt, zip) are allowed!'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('file');

// Upload Endpoint
app.post('/api/upload', authenticateToken, uploadLimiter, (req, res) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size exceeds the 10MB limit.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const newFile = {
      id: crypto.randomUUID(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      ownerId: req.user.id,
      ownerName: req.user.username,
      status: 'pending', // pending, approved, rejected
      uploadedAt: new Date().toISOString()
    };

    files.push(newFile);
    res.status(201).json(newFile);
  });
});

// Get User Files (Strict Isolation)
app.get('/api/files', authenticateToken, (req, res) => {
  // If admin, they can see ALL files to approve them.
  // If user, they can ONLY see their own files!
  if (req.user.role === 'admin') {
    res.json(files);
  } else {
    const userFiles = files.filter(f => f.ownerId === req.user.id);
    res.json(userFiles);
  }
});

// UUID format validation helper
const isValidUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Admin Approve/Reject File
app.put('/api/files/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Boundary: Validate UUID format to prevent injection
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid file ID format.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  if (!status || typeof status !== 'string' || !['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  const fileIndex = files.findIndex(f => f.id === id);
  if (fileIndex === -1) {
    return res.status(404).json({ error: 'File not found.' });
  }

  files[fileIndex].status = status;
  res.json(files[fileIndex]);
});

// View File (Authorization boundary + Owner matching)
app.get('/api/files/:id/view', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Boundary: Validate UUID format
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid file ID format.' });
  }

  const file = files.find(f => f.id === id);
  if (!file) {
    return res.status(404).json({ error: 'File not found.' });
  }

  // Authorization Check: Must be the owner OR an administrator
  if (file.ownerId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. You are not authorized to view this file.' });
  }

  // Approval Check: If not admin, file must be approved to view it
  if (file.status !== 'approved' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. This file is pending administrator approval.' });
  }

  // File Path Verification — resolve and ensure it stays within UPLOADS_DIR (path traversal prevention)
  const filePath = path.resolve(UPLOADS_DIR, file.filename);
  if (!filePath.startsWith(path.resolve(UPLOADS_DIR))) {
    return res.status(403).json({ error: 'Access denied. Invalid file path.' });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on storage server.' });
  }

  // Security: Sanitize filename for Content-Disposition (strip path components)
  const safeFilename = path.basename(file.originalName).replace(/[^a-zA-Z0-9._-]/g, '_');

  // Security: Set restrictive headers to prevent script execution from served files
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(safeFilename)}"`);
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  fs.createReadStream(filePath).pipe(res);
});

// Health check — does NOT leak internal counts
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`Assessment API Server running on port ${PORT}`);
});
