const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  availabilities: [
    {
      day: String,
      fromTime: String,
      toTime: String,
    },
  ],
  learn: [String],
  teach: [String],
  description: String,
  created_at: { type: Date, default: Date.now },
  banner: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

module.exports = mongoose.model('Post', postSchema);
