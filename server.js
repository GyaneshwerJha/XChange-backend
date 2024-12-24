const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const socketIo = require("socket.io");
const multer = require("multer");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://x-change-frontend.vercel.app", "https://x-change-zeta.vercel.app"],
    methods: ["GET", "POST"],
  },
});


app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads")); // Serve static files

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname +
        "-" +
        uniqueSuffix +
        "." +
        file.originalname.split(".").pop()
    );
  },
});

const upload = multer({ storage: storage });

mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

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

const Post = mongoose.model('Post', postSchema);

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

const User = mongoose.model("User", userSchema);

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Message = mongoose.model("Message", messageSchema);

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("sendMessage", async (data) => {
    try {
      const newMessage = new Message(data);
      await newMessage.save();
      socket.to(data.receiver).emit("receiveMessage", newMessage);
    } catch (error) {
      console.error("Error handling sendMessage:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.post("/api/register", upload.single("profilePic"), async (req, res) => {
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
});

app.post("/api/login", async (req, res) => {
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
});

app.post("/api/users/posts", upload.single("banner"), async (req, res) => {
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
});

app.get("/api/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send("User not found.");
    }
    res.send(user);
  } catch (error) {
    res.status(500).send("Error occurred: " + error.message);
  }
});

app.get("/api/posts", async (req, res) => {
  const users = await User.find();
  const posts = users.reduce((acc, user) => {
    const userPosts = user.posts.map((post) => ({
      ...post._doc,
      firstName: user.firstName,
      lastName: user.lastName,
      userEmail: user.email,
      profilePic: user.profilePic,
      averageRating: calculateAverageRating(user.ratings),
    }));
    return acc.concat(userPosts);
  }, []);
  res.send(posts);
});

app.get("/api/chat-history", async (req, res) => {
  try {
    const { sender, receiver } = req.query;

    if (!sender || !receiver) {
      return res.status(400).send("Sender and receiver IDs are required");
    }

    const messages = await Message.find({
      $or: [
        { sender: sender, receiver: receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort({ createdAt: 1 });

    res.send(messages);
  } catch (error) {
    res.status(500).send("Error occurred: " + error.message);
  }
});

app.get("/api/messages/recipient", async (req, res) => {
  try {
    const recipientId = req.query.recipientId;
    if (!recipientId) {
      return res.status(400).send("Recipient ID is required");
    }

    const messages = await Message.find({ receiver: recipientId }).sort({
      createdAt: -1,
    });
    res.send(messages);
  } catch (error) {
    res.status(500).send("Error occurred: " + error.message);
  }
});

app.get("/api/chat-users", async (req, res) => {
  try {
    const { userId } = req.query;

    const messagesSent = await Message.distinct("receiver", { sender: userId });
    const messagesReceived = await Message.distinct("sender", {
      receiver: userId,
    });
    const userIds = [...new Set([...messagesSent, ...messagesReceived])];

    const users = await User.find({ _id: { $in: userIds } });
    res.send(users);
  } catch (error) {
    res.status(500).send("Error occurred: " + error.message);
  }
});

// Add a connection
app.post("/api/users/:userId/connect", async (req, res) => {
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
});

// Remove a connection
app.post("/api/users/:userId/disconnect", async (req, res) => {
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
});

// Get a user's connections
app.get("/api/users/:userId/connections", async (req, res) => {
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
});

app.post("/api/users/:userId/rate", async (req, res) => {
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
});

app.get("/api/users/:userId/rating", async (req, res) => {
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
});

function calculateAverageRating(ratings) {
  if (ratings.length === 0) return 0;
  const total = ratings.reduce((acc, curr) => acc + curr.value, 0);
  return total / ratings.length;
}

const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`Listening on port ${port}...`));
