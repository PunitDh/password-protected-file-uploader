const express = require("express");
const app = express();
const multer = require("multer");
const mongoose = require("mongoose");
const port = 3000;
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const File = require("./models/File");

dotenv.config();

app.use(express.urlencoded({ extended: true }));

const upload = multer({
  dest: "uploads",
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then((response) =>
    console.log(
      "Successfully connected to database:",
      response.connections[0].name
    )
  )
  .catch((error) => console.log("Failed to connect to database", error));

app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  const files = await File.find();
  const fileLinks = files.map((file) => ({
    link: `${req.protocol}://${req.headers.host}/file/${file.id}`,
    originalName: file.originalName,
    downloadCount: file.downloadCount,
    id: file.id,
  }));
  res.render("index", { fileLinks });
});

app.get("/upload", async (req, res) => {
  res.redirect("/");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const fileData = {
    path: req.file.path,
    originalName: req.file.originalname,
    password:
      req.body.password?.length > 0
        ? await bcrypt.hash(req.body.password, 10)
        : null,
  };

  await File.create(fileData);
  res.redirect("/");
});

app.post("/delete/:id", async (req, res) => {
  const file = await File.deleteOne({ _id: req.params.id });
  res.redirect("/");
});

app.route("/file/:id").get(handleDownload).post(handleDownload);

async function handleDownload(req, res) {
  const file = await File.findById(req.params.id);

  if (file.password != null) {
    if (!req.body.password) {
      res.render("password");
      return;
    }

    if (!(await bcrypt.compare(req.body.password, file.password))) {
      res.render("password", { error: true });
      return;
    }
  }

  file.downloadCount++;
  await file.save();
  console.log(file.downloadCount);

  res.download(file.path, file.originalName);
}

app.listen(port, () => console.log("Server listening on port", port));
