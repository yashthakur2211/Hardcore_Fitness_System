import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

// Upload base64 photo to Cloudinary and return the secure URL
const saveMemberPhoto = async (memberId, photoData) => {
  if (!photoData) return null;

  try {
    // Already a Cloudinary or other full URL — return as-is
    if (photoData.startsWith('http')) {
      return photoData;
    }

    // Legacy local path — return as-is (backward-compat for existing records)
    if (photoData.startsWith('/uploads/')) {
      return photoData;
    }

    // Expect a data URL: "data:image/jpeg;base64,xxx"
    if (!photoData.startsWith('data:image/')) {
      console.error('Invalid photo data format');
      return null;
    }

    const result = await cloudinary.uploader.upload(photoData, {
      folder: 'gymmaster/members',
      public_id: memberId,
      overwrite: true,
      resource_type: 'image',
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });

    return result.secure_url;
  } catch (err) {
    console.error('Failed to upload member photo to Cloudinary:', err.message);
    return null;
  }
};

// Get all members
router.get('/', authenticateToken, async (req, res) => {
  try {
    // First, sync member statuses based on their latest memberships
    // This ensures the status is always up-to-date
    await pool.execute(`
      UPDATE members m
      LEFT JOIN (
        SELECT memberId, 
               MAX(endDate) as latestEndDate,
               MAX(CASE WHEN endDate >= CURDATE() THEN 1 ELSE 0 END) as hasActiveMembership
        FROM memberships
        GROUP BY memberId
      ) ms ON m.memberId = ms.memberId
      SET m.status = CASE
        WHEN ms.hasActiveMembership = 1 THEN 'active'
        WHEN ms.latestEndDate IS NOT NULL AND ms.latestEndDate < CURDATE() THEN 'expired'
        ELSE m.status
      END
      WHERE ms.memberId IS NOT NULL
    `);

    const [rows] = await pool.execute(`
      SELECT m.*, t.name as trainerName 
      FROM members m 
      LEFT JOIN trainers t ON m.assignedTrainerId = t.trainerId 
      ORDER BY m.createdAt DESC
    `);
    
    // Transform photo URLs to full URLs
    const protocol = req.protocol || 'http';
    const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
    const baseUrl = `${protocol}://${host}`;
    const transformed = rows.map(row => ({
      ...row,
      photo: row.photo ? (row.photo.startsWith('http') ? row.photo : `${baseUrl}${row.photo}`) : null
    }));
    
    res.json(transformed);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate next member ID - MUST be before '/:id' to avoid route conflict
router.get('/generate/id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT memberId FROM members ORDER BY memberId DESC LIMIT 1');
    
    let nextId = 'MEM001';
    if (rows.length > 0) {
      const lastId = rows[0].memberId;
      const num = parseInt(lastId.replace('MEM', '')) + 1;
      nextId = `MEM${num.toString().padStart(3, '0')}`;
    }
    
    res.json({ memberId: nextId });
  } catch (error) {
    console.error('Generate ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single member
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM members WHERE memberId = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Transform photo URL to full URL
    const protocol = req.protocol || 'http';
    const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
    const baseUrl = `${protocol}://${host}`;
    const member = rows[0];
    member.photo = member.photo ? (member.photo.startsWith('http') ? member.photo : `${baseUrl}${member.photo}`) : null;
    
    res.json(member);
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create member
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { memberId, name, phone, dob, address, photo, hasPersonalTrainer, assignedTrainerId } = req.body;

    if (!memberId || !name || !phone || !dob) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Handle assignedTrainerId - convert empty string to null
    let trainerId = null;
    if (hasPersonalTrainer && assignedTrainerId && assignedTrainerId.trim() !== '') {
      trainerId = assignedTrainerId;
      
      // Verify trainer exists
      const [trainerCheck] = await pool.execute(
        'SELECT trainerId FROM trainers WHERE trainerId = ?',
        [trainerId]
      );
      
      if (trainerCheck.length === 0) {
        return res.status(400).json({ error: 'Selected trainer does not exist' });
      }
    }

    const photoPath = photo ? await saveMemberPhoto(memberId, photo) : null;

    await pool.execute(
      `INSERT INTO members (memberId, name, phone, dob, address, photo, hasPersonalTrainer, assignedTrainerId, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [memberId, name, phone, dob, address || null, photoPath, hasPersonalTrainer || false, trainerId]
    );

    res.status(201).json({ message: 'Member created successfully', memberId });
  } catch (error) {
    console.error('Create member error:', error);
    console.error('Error details:', {
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      message: error.message
    });
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Member ID already exists' });
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'Invalid trainer reference. The selected trainer does not exist.' });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: process.env.NODE_ENV === 'development' ? error.code : undefined
    });
  }
});

// Partial update member (PATCH - only updates provided fields)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    const memberId = req.params.id;

    // Build dynamic update query
    const allowedFields = ['name', 'phone', 'dob', 'address', 'status', 'hasPersonalTrainer', 'assignedTrainerId'];
    const fieldsToUpdate = [];
    const values = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'hasPersonalTrainer') {
          fieldsToUpdate.push(`${field} = ?`);
          values.push(updates[field] ? 1 : 0);
        } else if (field === 'assignedTrainerId' && !updates.hasPersonalTrainer) {
          // If PT is being disabled, also clear the trainer
          fieldsToUpdate.push(`${field} = NULL`);
        } else {
          fieldsToUpdate.push(`${field} = ?`);
          values.push(updates[field]);
        }
      }
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(memberId);
    const query = `UPDATE members SET ${fieldsToUpdate.join(', ')} WHERE memberId = ?`;
    
    await pool.execute(query, values);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Member PATCH] Updated member:', memberId, 'Fields:', fieldsToUpdate);
    }

    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    console.error('Patch member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update member
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, phone, dob, address, photo, status, hasPersonalTrainer, assignedTrainerId } = req.body;

    // Build dynamic update query to only update fields that are provided
    let updateFields = [];
    let params = [];

    if (name !== undefined && name !== null) { updateFields.push('name = ?'); params.push(name); }
    if (phone !== undefined && phone !== null) { updateFields.push('phone = ?'); params.push(phone); }
    if (dob !== undefined && dob !== null && dob !== '') { 
      // Format dob to YYYY-MM-DD for MySQL
      const formattedDob = typeof dob === 'string' && dob.includes('T') ? dob.split('T')[0] : dob;
      updateFields.push('dob = ?'); 
      params.push(formattedDob); 
    }
    if (address !== undefined && address !== null) { updateFields.push('address = ?'); params.push(address); }
    if (status !== undefined && status !== null) { updateFields.push('status = ?'); params.push(status); }
    if (hasPersonalTrainer !== undefined && hasPersonalTrainer !== null) { updateFields.push('hasPersonalTrainer = ?'); params.push(hasPersonalTrainer ? 1 : 0); }
    if (assignedTrainerId !== undefined) { updateFields.push('assignedTrainerId = ?'); params.push(assignedTrainerId || null); }
    
    // Only update photo if it's provided (not null/undefined)
    if (photo) {
      const photoPath = await saveMemberPhoto(req.params.id, photo);
      if (photoPath) {
        updateFields.push('photo = ?');
        params.push(photoPath);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    await pool.execute(`UPDATE members SET ${updateFields.join(', ')} WHERE memberId = ?`, params);

    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    console.error('Update member error:', error);
    console.error('Error details:', error.message, error.code, error.sqlMessage);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete member
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM members WHERE memberId = ?', [req.params.id]);
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
