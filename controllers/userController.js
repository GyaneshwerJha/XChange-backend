const User = require("../models/userModel");
const Post = require("../models/postModel");
const Message = require("../models/messageModel");

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    let user = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      profilePic: req.file ? req.file.path : undefined,
      skills: req.body.skills,
    });
    user = await user.save();
    res.send(user);
  } catch (error) {
    res.status(500).send("Error occurred: " + error.message);
  }
};

// User login
exports.loginUser = async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.body.email,
      password: req.body.password,
    });
    if (!user) {
      return res.status(400).send("Invalid email or password.");
    }
    res.send(user);
  } catch (error) {
    res.status(500).send("Error occurred: " + error.message);
  }
};

// Get a single user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send("User not found.");
    }
    res.send(user);
  } catch (error) {
    res.status(500).send("Error occurred: " + error.message);
  }
};

// Post user content
exports.postUserContent = async (req, res) => {
  const { email, availabilities, learn, teach, description } = req.body;
  const user = await User.findOne({ email: email });
  if (!user) {
    return res.status(404).send("User not found.");
  }

  const parsedAvailabilities = JSON.parse(availabilities);

  const post = new Post({
    availabilities: parsedAvailabilities,
    learn: Array.isArray(learn) ? learn : [learn],
    teach: Array.isArray(teach) ? teach : [teach],
    description,
    userId: user._id,
    banner: req.file ? req.file.path : undefined,
  });

  user.posts.push(post);
  await user.save();
  res.status(201).send(post);
};

// Update user connections
exports.updateUserConnections = async (req, res) => {
  const { userId } = req.params;
  const { connectUserId } = req.body;

  try {
    const user = await User.findById(userId);
    const connectUser = await User.findById(connectUserId);

    if (!user || !connectUser) {
      return res.status(404).send("User not found.");
    }

    // Prevent duplicate connections
    if (!user.connections.includes(connectUserId)) {
      user.connections.push(connectUserId);
      await user.save();
    }

    res.status(200).send(user);
  } catch (error) {
    res.status(500).send("Error occurred: " + error.message);
  }
};

// Disconnect a user
exports.disconnectUser = async (req, res) => {
  const { userId } = req.params;
  const { connectUserId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found.");
    }

    user.connections = user.connections.filter(
      (id) => id.toString() !== connectUserId
    );
    await user.save();

    res.status(200).send(user);
  } catch (error) {
    res.status(500).send("Error occurred: " + error.message);
  }
};

// Get user connections
exports.getUserConnections = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId).populate("connections");
    if (!user) {
      return res.status(404).send("User not found.");
    }
    res.status(200).send(user.connections);
  } catch (error) {
    res.status(500).send("Error occurred: " + error.message);
  }
};

// Rate a user
exports.rateUser = async (req, res) => {
  const { userId } = req.params;
  const { raterId, value } = req.body;

  if (!raterId || !value) {
    return res.status(400).send("Rater ID and rating value are required.");
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found.");
    }

    // Check if the rater already rated this user
    const existingRatingIndex = user.ratings.findIndex(
      (r) => r.rater.toString() === raterId
    );
    if (existingRatingIndex > -1) {
      // Update existing rating
      user.ratings[existingRatingIndex].value = value;
    } else {
      // Add new rating
      user.ratings.push({ rater: raterId, value });
    }

    await user.save();
    res
      .status(200)
      .send({ averageRating: calculateAverageRating(user.ratings) });
  } catch (error) {
    res.status(500).send("Error occurred: " + error.message);
  }
};

// Get user rating
exports.getUserRating = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found.");
    }

    const averageRating = calculateAverageRating(user.ratings);
    res.status(200).send({ averageRating });
  } catch (error) {
    res.status(500).send("Error occurred: " + error.message);
  }
};

// Helper function to calculate average rating
function calculateAverageRating(ratings) {
  if (ratings.length === 0) return 0;
  const total = ratings.reduce((acc, curr) => acc + curr.value, 0);
  return total / ratings.length;
}
