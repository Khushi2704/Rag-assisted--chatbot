const express = require("express");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { indexDocument, askQuestions } = require("./rag");
const fs = require("fs");
const app = express();
app.use(express.json());

app.post("/upload", upload.single("pdf"), async (req, res) => {
  //   console.log(req.file);

  if (!req.file) {
    res.send("Please upload any PFD file");
  }

  if (req.file.mimetype !== "application/pdf") {
    res.send("Please upload only PDF file");
  }

  try {
    const buffer = fs.readFileSync(req.file.path);

    // Rag fn to upload file - Fn Name is IndexDocument
    const { documentId, filename, pages, totalChunks } = await indexDocument(
      buffer,
      req.file.originalname,
    );

    fs.unlinkSync(req.file.path);

    res.status(200).json({
      message: "File uploaded successfully",
      documentId,
      filename,
      pages,
      totalChunks,
    });
  } catch (err) {
    res.send(`Unexpected Error Occured ${err}`);
  }
});

app.post("/ask", async (req, res) => {
  console.log(req.body);
  const { question, documentId } = req.body;

  if (!question || !documentId) {
    res.status(400).json({
      message: "Please provide both question and documentId",
    });
  }

  try {
    const results = await askQuestions(question, documentId);
    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({
      message: `Unexpected Error Occured ${err}`,
    });
  }
});

app.listen(3000, () => console.log("Server is running on port 3000"));
