const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const fs = require('fs');
const { uploadFile, getFileLocation } = require('../services/storage');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

const upload = multer({ dest: '/tmp/' });

router.post(
  '/',
  authenticateToken,
  requireHouseholdRole('member'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: 'No file uploaded' });

      const body = fs.readFileSync(file.path);
      const key = await uploadFile(req.params.hhId, file.originalname, body, file.mimetype);
      fs.unlinkSync(file.path);

      res.json({ success: true, data: { key, url: getFileLocation(key) } });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
