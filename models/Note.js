const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const noteSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      enum: ["yellow", "blue", "green", "pink"],
      default: "yellow",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Note", noteSchema);
