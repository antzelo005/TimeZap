const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool, query } = require("../config/db");
const {
  createAppError,
  isValidEmail,
  validatePassword
} = require("../utils/validators");

function signToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );
}

function mapUser(row) {
  return {
    user_id: row.user_id,
    email: row.email,
    display_name: row.display_name || null,
    timezone: row.timezone,
    language: row.language,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function register(req, res, next) {
  let client;

  try {
    const { email, password } = req.body;

    if (!isValidEmail(email)) {
      throw createAppError(400, "A valid email is required");
    }

    if (!validatePassword(password)) {
      throw createAppError(400, "Password must be at least 6 characters");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await query("SELECT user_id FROM users WHERE email = $1 LIMIT 1", [normalizedEmail]);

    if (existingUser.rows.length > 0) {
      throw createAppError(409, "Email is already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    client = await pool.connect();
    await client.query("BEGIN");

    const insertUserResult = await client.query(
      `INSERT INTO users (email, password_hash, timezone, language, is_active, created_at, updated_at)
       VALUES ($1, $2, 'Europe/Athens', 'en', true, NOW(), NOW())
       RETURNING user_id, email, display_name, timezone, language, is_active, created_at, updated_at`,
      [normalizedEmail, passwordHash]
    );

    const user = insertUserResult.rows[0];

    await client.query(
      `INSERT INTO user_settings (
         user_id,
         theme,
         notifications_enabled,
         default_view,
         week_starts_on,
         created_at,
         updated_at
      ) VALUES ($1, 'system', true, 'dashboard', 'monday', NOW(), NOW())`,
      [user.user_id]
    );

    await client.query("COMMIT");

    const token = signToken(user);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: mapUser(user)
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => null);
    }
    next(error);
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email)) {
      throw createAppError(400, "A valid email is required");
    }

    if (!validatePassword(password)) {
      throw createAppError(400, "Password must be at least 6 characters");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await query(
      `SELECT user_id, email, display_name, password_hash, timezone, language, is_active, created_at, updated_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      throw createAppError(401, "Invalid email or password");
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      throw createAppError(401, "Invalid email or password");
    }

    if (!user.is_active) {
      throw createAppError(403, "User account is inactive");
    }

    const token = signToken(user);

    res.status(200).json({
      message: "Login successful",
      token,
      user: mapUser(user)
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const result = await query(
      `SELECT user_id, email, display_name, timezone, language, is_active, created_at, updated_at
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      throw createAppError(404, "User not found");
    }

    res.status(200).json({
      user: mapUser(result.rows[0])
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { email, display_name } = req.body;

    if (!isValidEmail(email)) {
      throw createAppError(400, "A valid email is required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const hasDisplayName = Object.prototype.hasOwnProperty.call(req.body, "display_name");
    const normalizedDisplayName =
      hasDisplayName && typeof display_name === "string" && display_name.trim()
        ? display_name.trim().slice(0, 120)
        : null;
    const duplicateResult = await query(
      "SELECT user_id FROM users WHERE email = $1 AND user_id <> $2 LIMIT 1",
      [normalizedEmail, req.user.user_id]
    );

    if (duplicateResult.rows.length > 0) {
      throw createAppError(409, "Email is already registered");
    }

    const result = await query(
      `UPDATE users
       SET email = $1,
           display_name = CASE WHEN $2 THEN $3 ELSE display_name END,
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING user_id, email, display_name, timezone, language, is_active, created_at, updated_at`,
      [normalizedEmail, hasDisplayName, normalizedDisplayName, req.user.user_id]
    );

    if (result.rows.length === 0) {
      throw createAppError(404, "User not found");
    }

    const user = mapUser(result.rows[0]);
    const token = signToken(user);

    res.status(200).json({
      message: "Profile updated successfully",
      token,
      user
    });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;

    if (!validatePassword(current_password)) {
      throw createAppError(400, "Current password is required");
    }

    if (!validatePassword(new_password)) {
      throw createAppError(400, "New password must be at least 6 characters");
    }

    const result = await query(
      `SELECT user_id, password_hash
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      throw createAppError(404, "User not found");
    }

    const passwordMatches = await bcrypt.compare(current_password, result.rows[0].password_hash);

    if (!passwordMatches) {
      throw createAppError(401, "Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    await query(
      `UPDATE users
       SET password_hash = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [passwordHash, req.user.user_id]
    );

    res.status(200).json({
      message: "Password updated successfully"
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  changePassword,
  login,
  me,
  register,
  updateProfile
};
