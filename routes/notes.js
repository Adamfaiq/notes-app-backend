const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const { protect } = require("../middleware/auth");

// Protect All Routes
router.use(protect);

// Create Notes
router.post("/", async (req, res) => {
  try {
    const { title, content, tags, color, isPinned } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Title and Content required" });
    }

    const note = await Note.create({
      userId: req.user._id,
      title,
      content,
      tags,
      color,
      isPinned,
    });

    res.status(201).json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}); // ✓ POST route close

// Get All Notes
router.get("/", async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user._id }).sort({
      isPinned: -1,
      createdAt: -1,
    });

    res.json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}); // ✓ GET all route close

// Search Notes
router.get("/search", async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return res
        .status(400)
        .json({ success: false, message: "Keyword required" });
    }

    const notes = await Note.find({
      userId: req.user._id,
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { content: { $regex: keyword, $options: "i" } },
        { tags: { $in: [new RegExp(keyword, "i")] } },
      ],
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: notes.length, notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}); // ✓ Search route close

// Add Tag to Note
router.put("/:id/tags/add", async (req, res) => {
  try {
    const { tag } = req.body;

    if (!tag) {
      return res.status(400).json({ success: false, message: "Tag required" });
    }

    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    }

    // Check if tag already exists
    if (note.tags.includes(tag)) {
      return res
        .status(400)
        .json({ success: false, message: "Tag already exists" });
    }

    note.tags.push(tag);
    await note.save();

    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove Tag from Note
router.put("/:id/tags/remove", async (req, res) => {
  try {
    const { tag } = req.body;

    if (!tag) {
      return res.status(400).json({ success: false, message: "Tag required" });
    }

    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    }

    // Remove tag from array
    note.tags = note.tags.filter((t) => t !== tag);
    await note.save();

    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle Pin Status
router.put("/:id/pin", async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    }

    // Toggle isPinned
    note.isPinned = !note.isPinned;
    await note.save();

    res.json({
      success: true,
      message: note.isPinned ? "Note pinned" : "Note unpinned",
      note,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Filter Notes (by color, pinned status, or both)
router.get("/filter", async (req, res) => {
  try {
    const { color, pinned } = req.query;

    // Build filter object
    const filter = { userId: req.user._id };

    if (color) {
      filter.color = color;
    }

    if (pinned !== undefined) {
      filter.isPinned = pinned === "true";
    }

    const notes = await Note.find(filter).sort({
      isPinned: -1,
      createdAt: -1,
    });

    res.json({
      success: true,
      filters: { color, pinned },
      count: notes.length,
      notes,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Notes by Tag
router.get("/tag/:tagName", async (req, res) => {
  try {
    const { tagName } = req.params;

    const notes = await Note.find({
      userId: req.user._id,
      tags: { $in: [tagName] },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      tag: tagName,
      count: notes.length,
      notes,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Single Note
router.get("/:id", async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    }

    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}); // ✓ GET single route close

// Update Notes
router.put("/:id", async (req, res) => {
  try {
    const { title, content } = req.body;

    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    }

    if (title) note.title = title;
    if (content) note.content = content;

    await note.save();

    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}); // ✓ PUT route close

// Delete Notes
router.delete("/:id", async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: "Note not found" });
    }

    await Note.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Note deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}); // ✓ DELETE route close

module.exports = router;
