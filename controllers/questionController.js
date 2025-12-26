import Question from "../models/Question.js";

// GET all questions
export const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE a new question
export const createQuestion = async (req, res) => {
  try {
    const { question, answer, assignedTo } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ success: false, message: "Question and answer are required" });
    }
    const newQuestion = new Question({ question, answer, assignedTo });
    await newQuestion.save();
    res.json({ success: true, question: newQuestion });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// UPDATE a question
export const updateQuestion = async (req, res) => {
  try {
    const { question, answer, assignedTo } = req.body;
    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      { question, answer, assignedTo },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Question not found" });
    res.json({ success: true, question: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE a question
export const deleteQuestion = async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Question not found" });
    res.json({ success: true, message: "Question deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getNextQuestion = async (req, res) => {
  const currentIndex = Number(req.query.currentIndex) || 0;
  try {
    const questions = await Question.find().sort({ createdAt: 1 });
    const nextQuestion = questions[currentIndex] || null;
    res.json({ success: true, question: nextQuestion });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};