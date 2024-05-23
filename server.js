const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true in production with HTTPS
}));

// Connect to MongoDB
const uri = "mongodb+srv://stefantraian18:VZkDiToAInQakiDE@cluster0.58u7jry.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Define User Schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    info: String
});
const User = mongoose.model('User', userSchema);

// Define Post Schema
const postSchema = new mongoose.Schema({
    content: String,
    date: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const Post = mongoose.model('Post', postSchema);

// Define Comment Schema
const commentSchema = new mongoose.Schema({
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    date: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

// User registration endpoint
app.post('/api/register', async (req, res) => {
    const { username, password, info } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, info });
    await user.save();
    res.send({ message: 'User registered successfully' });
});

// User login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id;
        res.send({ message: 'Login successful' });
    } else {
        res.status(401).send({ message: 'Invalid credentials' });
    }
});

// Endpoint for creating posts
app.post('/api/posts', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
    const post = new Post({
        content: req.body.content,
        userId: req.session.userId
    });
    await post.save();
    res.send(post);
});

// Endpoint for deleting posts
app.delete('/api/posts/:postId', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
    const post = await Post.findById(req.params.postId);
    if (post.userId.toString() !== req.session.userId) {
        return res.status(403).send({ message: 'Forbidden' });
    }
    await Post.deleteOne({ _id: req.params.postId });
    res.send({ message: 'Post deleted' });
});

// Endpoint for adding comments to a post
app.post('/api/posts/:postId/comments', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
    const comment = new Comment({
        postId: req.params.postId,
        userId: req.session.userId,
        content: req.body.content
    });
    await comment.save();
    res.send(comment);
});

// Endpoint for getting posts
app.get('/api/posts', async (req, res) => {
    const posts = await Post.find().populate('userId', 'username').sort({ date: -1 });
    res.send(posts);
});

// Endpoint for getting comments for a post
app.get('/api/posts/:postId/comments', async (req, res) => {
    const comments = await Comment.find({ postId: req.params.postId }).populate('userId', 'username');
    res.send(comments);
});

// Endpoint for getting user info
app.get('/api/user-info', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.session.userId);
    res.send(user);
});

// Serve the frontend files
app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
