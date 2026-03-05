var express = require('express');
var router = express.Router();

router.post('/ask', async (req, res) => {
  const { question = '' } = req.body;

  const prompt = `
  你是一个中文问答聊天机器人，请用中文回答问题。
  问题：${question}
  `
  const raw = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama3',
      prompt,
      stream: false,
    })
  })

  const result = await raw.json();

  res.json({
    answer: result.response,
  })
})

module.exports = router;
