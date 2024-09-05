const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const sqlite3 = require('sqlite3').verbose();
const Jimp = require('jimp');

const app = express();
const upload = multer();
const db = new sqlite3.Database('images.db');

// สร้างตารางในฐานข้อมูล (ถ้ายังไม่มี)
db.run(`CREATE TABLE IF NOT EXISTS images (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT)`);

app.post('/upload', upload.single('image'), (req, res) => {
  Tesseract.recognize(req.file.buffer)
    .then(({ data: { text } }) => {
      db.run('INSERT INTO images (text) VALUES (?)', [text], function(err) {
        if (err) {
          return res.status(500).send(err);
        }
        res.send({ imageId: this.lastID });
      });
    });
});

app.get('/image/:id', (req, res) => {
  const imageId = req.params.id;
  db.get('SELECT text FROM images WHERE id = ?', [imageId], async (err, row) => {
    if (err || !row) {
      return res.status(404).send('Image not found');
    }

    try {
      const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK); // เลือกขนาดและสีฟอนต์ตามต้องการ
      const imageWidth = 400; // ปรับขนาดความกว้างของภาพตามต้องการ
      const imageHeight = Jimp.measureTextHeight(font, row.text, imageWidth); // คำนวณความสูงของภาพตามข้อความ

      const image = new Jimp(imageWidth, imageHeight, 0xffffffff); // สร้างภาพพื้นหลังสีขาว
      image.print(font, 0, 0, {
        text: row.text,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
      }, imageWidth, imageHeight);

      const imageBuffer = await image.getBufferAsync(Jimp.MIME_PNG); // แปลงเป็น buffer PNG
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(imageBuffer); 
    } catch (error) {
      console.error(error);
      res.status(500).send('Error creating image');
    }
  });
});

app.listen(3000, () => console.log('Server started on port 3000'));
