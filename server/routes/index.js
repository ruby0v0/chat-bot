var express = require('express');
var router = express.Router();

const conversations = [];

router.post('/ask', async (req, res) => {
	const { question = '' } = req.body;

	const prompt = [
		'你是一个中文问答聊天机器人，请用中文回答问题。',
		...conversations.map(
			(item) => `${item.role === 'user' ? '用户' : '助手'}：${item.content}`,
		),
		`用户的问题：${question}`,
	].join('\n');

	const raw = await fetch('http://localhost:11434/api/generate', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: 'llama3',
			prompt,
			stream: true,
		}),
	});

	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');

	const reader = raw.body.getReader();
	const decoder = new TextDecoder();
	let answer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			const chunk = decoder.decode(value, { stream: true });

			const lines = chunk.split('\n').filter((line) => line.trim());

			for (const line of lines) {
				try {
					const data = JSON.parse(line);
					if (data.response) {
						answer += data.response;
						res.write(`${JSON.stringify({ response: data.response })}\n`);
					}
				} catch (error) {
					console.error('JSON 解析失败：', error.message);
				}
			}
		}

		conversations.push(
			{
				role: 'user',
				content: question,
			},
			{
				role: 'assistant',
				content: answer,
			},
		);

		if (conversations.length > 20) {
			conversations.splice(0, conversations.length - 20);
		}
	} finally {
		res.end();
	}
});

router.get('/history', (req, res) => {
	res.json({
    code: 200,
    message: '操作成功',
    data: conversations,
  });
});

router.post('/clear', (req, res) => {
	conversations.length = 0;
	res.json({
    code: 200,
    message: '操作成功',
    data: null,
  });
});

module.exports = router;
