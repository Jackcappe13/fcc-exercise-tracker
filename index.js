const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
let bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
let mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
});

const exerciseSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: String,
});

const logSchema = new mongoose.Schema({
  count: Number,
  log: Array,
});

let User = mongoose.model("User", userSchema);
let Exercise = mongoose.model("Exercise", exerciseSchema);
let Log = mongoose.model("Log", logSchema);

app.post("/api/users", (req, res) => {
  let currentUser = new User({ username: req.body.username });
  res.json(currentUser);
  currentUser.save();
});
app.get("/api/users", (req, res) => {
  User.find({}).then((data) => {
    res.json(data);
  });
});
app.post("/api/users/:_id/exercises", async (req, res) => {
  let userName = await User.findOne({ _id: req.params._id })
    .select({ __v: 0 })
    .then((data) => {
      return data;
    });
  // parse date input
  let chosenDate = new Date(req.body.date).toDateString();
  //in no input
  if (!req.body.date) {
    chosenDate = new Date().toDateString();
  }
  if (!userName) return res.json("No user found with this Id");
  if (userName) {
    let currentExercise = await Exercise.create({
      user_id: userName._id,
      description: req.body.description,
      duration: req.body.duration,
      date: chosenDate,
    });
    res.json({
      username: userName.username,
      _id: userName._id,
      description: currentExercise.description,
      duration: currentExercise.duration,
      date: currentExercise.date,
    });
    currentExercise.save();
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  let user = await User.findById(id).then((data) => data);
  if (!user) return res.json("No user found with this Id");
  let dataObject = {};
  if (from) {
    dataObject["$gte"] = new Date(from);
  }
  if (to) {
    dataObject["lte"] = new Date(to);
  }
  let filter = {
    user_id: id,
  };
  if (from || to) {
    filter.date = dataObject;
  }
  let exercises = [];
  exercises = await Exercise.find({ user_id: user._id })
    .select({ __v: 0, username: 0, _id: 0 })
    .limit(+limit ?? 500)
    .then((data) => {
      return data;
    });
  if (!exercises) return res.json("No exercises found for this user");
  let userLog = await Log.create({
    count: exercises.length,
    log: exercises,
  });
  res.json({
    username: user.username,
    count: userLog.count,
    _id: user._id,
    log: userLog.log,
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

exports.UserModel = User;
exports.ExerciseModel = Exercise;
exports.LogModel = Log;
