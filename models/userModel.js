const mongoose = require('mongoose');
const postSchema = require('./postModel').schema; 
const ratingSchema = new mongoose.Schema({
  rater: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  value: { type: Number, required: true, min: 1, max: 5 },
});

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  profilePic: String,
  skills: [String],
  posts: [postSchema],
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  ratings: [ratingSchema],
});

module.exports = mongoose.model("User", userSchema);
