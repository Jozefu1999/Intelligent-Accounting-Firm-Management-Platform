const submitContactMessage = async (req, res, next) => {
  try {
    const { sujet, message, user_id } = req.body;
    const authenticatedUserId = Number(req.user.id);

    if (!sujet || !message || !user_id) {
      return res.status(400).json({ message: 'Sujet, message and user_id are required.' });
    }

    if (Number(user_id) !== authenticatedUserId) {
      return res.status(403).json({ message: 'Forbidden. Invalid user context.' });
    }

    res.status(201).json({
      message: 'Message sent successfully.',
      contact: {
        user_id: Number(user_id),
        sujet,
        message,
        sent_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitContactMessage,
};
